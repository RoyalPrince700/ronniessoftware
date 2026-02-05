const express = require('express');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, validateRequired, validateEmail, validateMinLength } = require('../utils/validation');

const router = express.Router();

// Public signup endpoint
router.post('/signup', [
  validateRequest({
    email: [validateRequired, validateEmail],
    password: [validateRequired, (value) => validateMinLength(value, 6, 'Password')],
    name: [validateRequired, (value) => validateMinLength(value, 2, 'Name')]
  })
], async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create new user (default role is staff)
    const user = new User({
      email,
      password,
      name,
      role: 'staff' // Public signups default to staff role
    });

    await user.save();

    res.status(201).json({
      message: 'Registration successful. Please wait for admin approval.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// Register new user (admin only)
router.post('/register', [
  authenticateToken,
  validateRequest({
    email: [validateRequired, validateEmail],
    password: [validateRequired, (value) => validateMinLength(value, 6, 'Password')],
    name: [validateRequired, (value) => validateMinLength(value, 2, 'Name')],
    role: [(value) => {
      if (value && !['admin', 'staff'].includes(value)) {
        return 'Role must be admin or staff';
      }
      return null;
    }]
  })
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can register new users' });
    }

    const { email, password, name, role = 'staff' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', [
  validateRequest({
    email: [validateRequired, validateEmail],
    password: [validateRequired]
  })
], async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is pending approval or deactivated' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/change-password', [
  authenticateToken,
  validateRequest({
    currentPassword: [validateRequired],
    newPassword: [validateRequired, (value) => validateMinLength(value, 6, 'New password')]
  })
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isValidPassword = await req.user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;