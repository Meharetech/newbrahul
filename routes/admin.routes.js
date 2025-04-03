const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const adminAuth = require('../middleware/adminAuth');

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  adminController.login
);

// @route   GET /api/admin/profile
// @desc    Get admin profile
// @access  Private (Admin only)
router.get('/profile', adminAuth, adminController.getProfile);

// @route   GET /api/admin/dashboard/stats
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard/stats', adminAuth, adminController.getDashboardStats);

module.exports = router;
