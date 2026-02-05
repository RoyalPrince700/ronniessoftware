const express = require('express');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const StockHistory = require('../models/StockHistory');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRequest, validateRequired, validateMinLength, validateNumeric, validateBoolean } = require('../utils/validation');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Get dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    // Get total products count
    const totalProducts = await Product.countDocuments({ isActive: true });

    // Get low stock products
    const lowStockProducts = await Product.find({
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    }).select('name currentStock minStockLevel unit');

    // Get total sales today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await Sale.find({
      saleDate: { $gte: today, $lt: tomorrow },
      status: 'completed'
    });

    const totalSalesToday = todaySales.reduce((sum, sale) => sum + sale.finalAmount, 0);
    const totalTransactionsToday = todaySales.length;

    // Get recent stock changes
    const recentStockChanges = await StockHistory.find()
      .populate('product', 'name')
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get total stock value
    const allProducts = await Product.find({ isActive: true });
    const totalStockValue = allProducts.reduce((sum, product) =>
      sum + (product.currentStock * product.pricePerUnit), 0);

    res.json({
      totalProducts,
      lowStockProducts,
      totalSalesToday,
      totalTransactionsToday,
      recentStockChanges,
      totalStockValue
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new product/stock
router.post('/products', [
  validateRequest({
    name: [validateRequired, (value) => validateMinLength(value, 2, 'Product name')],
    category: [validateRequired, (value) => {
      const validCategories = ['ankara', 'german_wool', 'cotton', 'silk', 'linen', 'other'];
      if (!validCategories.includes(value)) {
        return 'Invalid category';
      }
      return null;
    }],
    totalStock: [validateRequired, (value) => {
      const num = Number(value);
      if (isNaN(num) || num <= 0) {
        return 'Total stock must be greater than 0';
      }
      return null;
    }],
    unit: [(value) => {
      if (value && !['yards', 'meters', 'pieces'].includes(value)) {
        return 'Invalid unit';
      }
      return null;
    }],
    pricePerUnit: [validateRequired, validateNumeric],
    minStockLevel: [(value) => {
      if (value !== undefined) {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return 'Minimum stock level must be non-negative';
        }
      }
      return null;
    }]
  })
], async (req, res) => {
  try {
    const { name, category, description, totalStock, unit = 'yards', pricePerUnit, minStockLevel = 10 } = req.body;

    // Check if product already exists
    const existingProduct = await Product.findOne({ name: name.toLowerCase(), isActive: true });
    if (existingProduct) {
      return res.status(400).json({ message: 'Product with this name already exists' });
    }

    const product = new Product({
      name,
      category,
      description,
      totalStock,
      currentStock: totalStock, // Initially current stock equals total stock
      unit,
      pricePerUnit,
      minStockLevel,
      addedBy: req.user._id
    });

    await product.save();

    // Record stock history
    const stockHistory = new StockHistory({
      product: product._id,
      productName: product.name,
      action: 'added',
      quantity: totalStock,
      previousStock: 0,
      newStock: totalStock,
      unit: product.unit,
      performedBy: req.user._id,
      notes: 'Initial stock added'
    });

    await stockHistory.save();

    const populatedProduct = await Product.findById(product._id).populate('addedBy', 'name');

    res.status(201).json({
      message: 'Product added successfully',
      product: populatedProduct
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Optional validation for updates
    if (updates.name && updates.name.length < 2) {
      return res.status(400).json({ message: 'Product name must be at least 2 characters' });
    }
    if (updates.category && !['ankara', 'german_wool', 'cotton', 'silk', 'linen', 'other'].includes(updates.category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    if (updates.totalStock !== undefined && (isNaN(Number(updates.totalStock)) || Number(updates.totalStock) < 0)) {
      return res.status(400).json({ message: 'Total stock must be non-negative' });
    }
    if (updates.pricePerUnit !== undefined && (isNaN(Number(updates.pricePerUnit)) || Number(updates.pricePerUnit) < 0)) {
      return res.status(400).json({ message: 'Price per unit must be non-negative' });
    }
    if (updates.minStockLevel !== undefined && (isNaN(Number(updates.minStockLevel)) || Number(updates.minStockLevel) < 0)) {
      return res.status(400).json({ message: 'Minimum stock level must be non-negative' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Track stock changes
    let previousStock = product.currentStock;
    let stockChange = 0;

    if (updates.totalStock !== undefined && updates.totalStock !== product.totalStock) {
      // If total stock is being updated, adjust current stock accordingly
      const stockDifference = updates.totalStock - product.totalStock;
      updates.currentStock = product.currentStock + stockDifference;
      stockChange = stockDifference;
    }

    // Update product
    Object.keys(updates).forEach(key => {
      product[key] = updates[key];
    });

    await product.save();

    // Record stock history if stock changed
    if (stockChange !== 0) {
      const stockHistory = new StockHistory({
        product: product._id,
        productName: product.name,
        action: stockChange > 0 ? 'added' : 'adjusted',
        quantity: Math.abs(stockChange),
        previousStock,
        newStock: product.currentStock,
        unit: product.unit,
        performedBy: req.user._id,
        notes: 'Stock updated by admin'
      });

      await stockHistory.save();
    }

    const updatedProduct = await Product.findById(id).populate('addedBy', 'name');

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product (soft delete)
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.isActive = false;
    await product.save();

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get stock history
router.get('/stock-history', async (req, res) => {
  try {
    const { page = 1, limit = 20, productId, dateFrom, dateTo } = req.query;

    let query = {};

    if (productId) {
      query.product = productId;
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) {
        // Set dateTo to end of day (23:59:59.999) to include all entries from that day
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query.date.$lte = endOfDay;
      }
    }

    const stockHistory = await StockHistory.find(query)
      .populate('product', 'name category')
      .populate('performedBy', 'name')
      .populate('sale', 'saleNumber customerName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StockHistory.countDocuments(query);

    res.json({
      stockHistory,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Stock history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sales report
router.get('/sales-report', async (req, res) => {
  try {
    const { dateFrom, dateTo, staffId } = req.query;

    let query = { status: 'completed' };

    if (dateFrom || dateTo) {
      query.saleDate = {};
      if (dateFrom) query.saleDate.$gte = new Date(dateFrom);
      if (dateTo) {
        // Set dateTo to end of day (23:59:59.999) to include all sales from that day
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query.saleDate.$lte = endOfDay;
      }
    }

    if (staffId) {
      // Validate that the staffId is a valid ObjectId and belongs to an active staff member
      const staffMember = await User.findOne({
        _id: staffId,
        role: 'staff',
        isActive: true
      });
      if (staffMember) {
        query.soldBy = staffId;
      } else {
        // If staff member not found, return empty results
        return res.json({
          sales: [],
          summary: {
            totalSales: 0,
            totalTransactions: 0,
            averageSale: 0
          }
        });
      }
    }

    const sales = await Sale.find(query)
      .populate('soldBy', 'name')
      .populate('items.product', 'name category')
      .sort({ saleDate: -1 });

    const totalSales = sales.reduce((sum, sale) => sum + sale.finalAmount, 0);
    const totalTransactions = sales.length;

    res.json({
      sales,
      summary: {
        totalSales,
        totalTransactions,
        averageSale: totalTransactions > 0 ? totalSales / totalTransactions : 0
      }
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all staff/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('email name role isActive createdAt updatedAt')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status
router.put('/users/:id/status', validateRequest({
  isActive: [validateRequired, validateBoolean]
}), async (req, res) => {
  try {

    const { isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString() && !isActive) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role
router.put('/users/:id/role', validateRequest({
  role: [validateRequired, (value) => {
    if (!['admin', 'staff'].includes(value)) {
      return 'Role must be admin or staff';
    }
    return null;
  }]
}), async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    // Prevent the last admin from being demoted
    if (user.role === 'admin' && role === 'staff') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot demote the last active admin' });
      }
    }

    user.role = role;
    await user.save();

    res.json({
      message: `User role updated to ${role} successfully`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;