const express = require('express');
const { body, validationResult } = require('express-validator');
const { jsPDF } = require('jspdf');
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
  body('customerPhone').optional().isLength({ min: 0, max: 15 }).withMessage('Phone number must be at most 15 characters'),
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

    // Generate unique sale number
    let saleNumber;
    let attempts = 0;
    const maxAttempts = 10;

    try {
      do {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        saleNumber = `RF${year}${month}${day}${random}`;
        attempts++;

        const existingSale = await Sale.findOne({ saleNumber });
        if (!existingSale) {
          break; // Found unique sale number
        }
      } while (attempts < maxAttempts);
    } catch (error) {
      console.error('Error generating sale number:', error);
      return res.status(500).json({ message: 'Error generating sale number' });
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({ message: 'Could not generate unique sale number' });
    }


    // Create sale
    const sale = new Sale({
      saleNumber,
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

// Get sale receipt as PDF by ID
router.get('/sales/:id/receipt/pdf', async (req, res) => {
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

    // Create PDF document - Standard 80mm thermal receipt printer width
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297]  // 80mm width (standard receipt printer), 297mm height (A4 length)
    });

    // Set font
    doc.setFont('helvetica');

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RONNIE\'S FABRICS', 40, 15, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Fabric Inventory Management', 40, 22, { align: 'center' });
    doc.text('Quality Fabrics for Every Need', 40, 27, { align: 'center' });

    // Sale details
    let yPos = 40;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    doc.text(`Sale #: ${sale.saleNumber}`, 10, yPos);
    yPos += 5;
    doc.text(`Date: ${new Date(sale.saleDate).toLocaleDateString()}`, 10, yPos);
    yPos += 5;
    doc.text(`Time: ${new Date(sale.saleDate).toLocaleTimeString()}`, 10, yPos);
    yPos += 8;

    // Customer info
    doc.text(`Customer: ${sale.customerName}`, 10, yPos);
    yPos += 5;
    if (sale.customerPhone) {
      doc.text(`Phone: ${sale.customerPhone}`, 10, yPos);
      yPos += 5;
    }
    yPos += 3;

    // Items header
    doc.setFont('helvetica', 'bold');
    doc.text('ITEMS PURCHASED', 10, yPos);
    yPos += 6;

    // Items
    doc.setFont('helvetica', 'normal');
    sale.items.forEach(item => {
      // Product name
      const productName = item.productName.length > 25 ?
        item.productName.substring(0, 22) + '...' : item.productName;
      doc.text(productName, 10, yPos);

      // Quantity and unit price
      const qtyText = `${item.quantity} ${item.unit} × ₦${item.unitPrice.toLocaleString()}`;
      doc.text(qtyText, 10, yPos + 4);

      // Total price
      doc.text(`₦${item.totalPrice.toLocaleString()}`, 75, yPos, { align: 'right' });

      yPos += 10;

      // Check if we need a new page (thermal paper is continuous, but break for readability)
      if (yPos > 150) {  // Higher threshold to fit more items before breaking
        doc.addPage();
        yPos = 20;
      }
    });

    // Totals section
    yPos += 2;
    doc.setLineWidth(0.5);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;

    doc.text(`Subtotal: ₦${sale.totalAmount.toLocaleString()}`, 5, yPos);
    yPos += 5;

    if (sale.discount > 0) {
      doc.text(`Discount: -₦${sale.discount.toLocaleString()}`, 5, yPos);
      yPos += 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`TOTAL: ₦${sale.finalAmount.toLocaleString()}`, 5, yPos);
    yPos += 8;

    // Payment method
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Payment: ${sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)}`, 10, yPos);
    yPos += 5;

    // Staff
    doc.text(`Served by: ${sale.soldBy.name}`, 10, yPos);
    yPos += 8;

    // Notes
    if (sale.notes) {
      doc.text(`Notes: ${sale.notes}`, 10, yPos);
      yPos += 5;
    }

    // Footer - No page break needed for continuous thermal paper

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Thank you for shopping with us!', 40, yPos, { align: 'center' });
    yPos += 4;
    doc.text('Quality fabrics guaranteed', 40, yPos, { align: 'center' });
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('RONNIE\'S FABRICS', 40, yPos, { align: 'center' });

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${sale.saleNumber}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.byteLength);

    // Send PDF
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('Generate PDF receipt error:', error);
    res.status(500).json({ message: 'Server error generating PDF' });
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