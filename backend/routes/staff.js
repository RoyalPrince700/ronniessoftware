const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const StockHistory = require('../models/StockHistory');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// All staff routes require authentication and staff/admin role
router.use(authenticateToken);
router.use(requireStaff);

// Get available products for sale
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      currentStock: { $gt: 0 }
    }).select('name category currentStock unit pricePerUnit description');

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new sale
router.post('/sales', [
  body('customerName').trim().isLength({ min: 2 }).withMessage('Customer name must be at least 2 characters'),
  body('customerPhone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.quantity').isFloat({ min: 0.1 }).withMessage('Quantity must be greater than 0'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be non-negative'),
  body('paymentMethod').optional().isIn(['cash', 'card', 'transfer', 'credit']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerName, customerPhone, items, discount = 0, paymentMethod = 'cash', notes } = req.body;

    // Validate items and check stock availability
    let totalAmount = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.productId}` });
      }

      if (!product.isActive) {
        return res.status(400).json({ message: `Product is not available: ${product.name}` });
      }

      if (product.currentStock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.currentStock} ${product.unit}`
        });
      }

      const itemTotal = item.quantity * product.pricePerUnit;
      totalAmount += itemTotal;

      saleItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.pricePerUnit,
        totalPrice: itemTotal,
        unit: product.unit
      });
    }

    const finalAmount = totalAmount - discount;

    if (finalAmount < 0) {
      return res.status(400).json({ message: 'Discount cannot exceed total amount' });
    }

    // Create sale
    const sale = new Sale({
      customerName,
      customerPhone,
      items: saleItems,
      totalAmount,
      discount,
      finalAmount,
      paymentMethod,
      soldBy: req.user._id,
      notes
    });

    await sale.save();

    // Update product stock and create stock history
    for (const item of saleItems) {
      const product = await Product.findById(item.product);

      const previousStock = product.currentStock;
      product.currentStock -= item.quantity;
      await product.save();

      // Record stock history
      const stockHistory = new StockHistory({
        product: product._id,
        productName: product.name,
        action: 'sold',
        quantity: item.quantity,
        previousStock,
        newStock: product.currentStock,
        unit: product.unit,
        performedBy: req.user._id,
        sale: sale._id,
        notes: `Sold to ${customerName}`
      });

      await stockHistory.save();
    }

    // Populate sale data for response
    const populatedSale = await Sale.findById(sale._id)
      .populate('soldBy', 'name')
      .populate('items.product', 'name category');

    res.status(201).json({
      message: 'Sale completed successfully',
      sale: populatedSale
    });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ message: 'Server error during sale' });
  }
});

// Get sales by staff member
router.get('/sales', async (req, res) => {
  try {
    const { page = 1, limit = 10, dateFrom, dateTo } = req.query;

    let query = { soldBy: req.user._id, status: 'completed' };

    if (dateFrom || dateTo) {
      query.saleDate = {};
      if (dateFrom) query.saleDate.$gte = new Date(dateFrom);
      if (dateTo) query.saleDate.$lte = new Date(dateTo);
    }

    const sales = await Sale.find(query)
      .populate('items.product', 'name category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sale.countDocuments(query);

    // Calculate totals for the period
    const salesData = await Sale.find(query);
    const totalSalesAmount = salesData.reduce((sum, sale) => sum + sale.finalAmount, 0);
    const totalTransactions = salesData.length;

    res.json({
      sales,
      summary: {
        totalSalesAmount,
        totalTransactions,
        averageSale: totalTransactions > 0 ? totalSalesAmount / totalTransactions : 0
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sale receipt by ID
router.get('/sales/:id/receipt', async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      soldBy: req.user._id
    })
    .populate('soldBy', 'name')
    .populate('items.product', 'name category');

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    // Generate receipt data
    const receipt = {
      saleNumber: sale.saleNumber,
      date: sale.saleDate,
      customer: {
        name: sale.customerName,
        phone: sale.customerPhone
      },
      items: sale.items,
      totals: {
        subtotal: sale.totalAmount,
        discount: sale.discount,
        finalAmount: sale.finalAmount
      },
      paymentMethod: sale.paymentMethod,
      soldBy: sale.soldBy.name,
      notes: sale.notes
    };

    res.json(receipt);
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's sales summary for staff
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await Sale.find({
      soldBy: req.user._id,
      saleDate: { $gte: today, $lt: tomorrow },
      status: 'completed'
    }).populate('items.product', 'name category');

    const totalSalesToday = todaySales.reduce((sum, sale) => sum + sale.finalAmount, 0);
    const totalTransactionsToday = todaySales.length;

    // Get low stock warnings (only show if staff needs to know)
    const lowStockProducts = await Product.find({
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    }).select('name currentStock minStockLevel unit');

    res.json({
      todaySummary: {
        totalSales: totalSalesToday,
        totalTransactions: totalTransactionsToday,
        averageSale: totalTransactionsToday > 0 ? totalSalesToday / totalTransactionsToday : 0
      },
      recentSales: todaySales.slice(0, 5), // Last 5 sales today
      lowStockAlerts: lowStockProducts
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search products by name or category
router.get('/products/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const products = await Product.find({
      isActive: true,
      currentStock: { $gt: 0 },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ]
    }).select('name category currentStock unit pricePerUnit description');

    res.json(products);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;