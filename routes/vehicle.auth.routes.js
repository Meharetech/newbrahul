const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const vehicleAuthController = require('../controllers/vehicle.auth.controller');
const vehicleAuth = require('../middleware/vehicleAuth');

// @route   POST /api/vehicle/auth/register
// @desc    Register a vehicle owner
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('contactNumber', 'Contact number is required').not().isEmpty(),
    check('address', 'Address is required').not().isEmpty(),
    check('city', 'City is required').not().isEmpty(),
    check('state', 'State is required').not().isEmpty(),
    check('pincode', 'Pincode is required').not().isEmpty()
  ],
  vehicleAuthController.register
);

// @route   POST /api/vehicle/auth/login
// @desc    Authenticate vehicle owner & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  vehicleAuthController.login
);

// @route   GET /api/vehicle/auth/me
// @desc    Get current vehicle owner profile
// @access  Private
router.get('/me', vehicleAuth, vehicleAuthController.getMe);

// @route   GET /api/vehicle/auth/verify-email/:token
// @desc    Verify email address
// @access  Public
router.get('/verify-email/:token', vehicleAuthController.verifyEmail);

// @route   PUT /api/vehicle/auth/profile
// @desc    Update vehicle owner profile
// @access  Private
router.put('/profile', vehicleAuth, vehicleAuthController.updateProfile);

// @route   PUT /api/vehicle/auth/change-password
// @desc    Change password
// @access  Private
router.put(
  '/change-password',
  [
    vehicleAuth,
    check('currentPassword', 'Current password is required').exists(),
    check('newPassword', 'Please enter a new password with 6 or more characters').isLength({ min: 6 })
  ],
  vehicleAuthController.changePassword
);

module.exports = router;
