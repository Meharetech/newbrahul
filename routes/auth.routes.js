const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],
  authController.register
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  authController.login
);

// @route   GET /api/auth/me
// @desc    Get current authenticated user
// @access  Private
router.get('/me', auth, authController.getCurrentUser);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, authController.getProfile);

// @route   GET /api/auth/detailed-profile
// @desc    Get detailed user profile information
// @access  Private
router.get('/detailed-profile', auth, authController.getDetailedProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, authController.updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put(
  '/change-password',
  [
    auth,
    check('currentPassword', 'Current password is required').exists(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
  ],
  authController.changePassword
);

// @route   PUT /api/auth/switch-role
// @desc    Switch user role
// @access  Private
router.put(
  '/switch-role',
  [
    auth,
    check('role', 'Role is required').not().isEmpty(),
    check('role', 'Invalid role').isIn(['donor', 'requestor'])
  ],
  authController.switchRole
);

// @route   POST /api/auth/forgot-password
// @desc    Send OTP to user's email for password reset
// @access  Public
router.post(
  '/forgot-password',
  [
    check('email', 'Please include a valid email').isEmail()
  ],
  authController.forgotPassword
);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for password reset
// @access  Public
router.post(
  '/verify-otp',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('otp', 'OTP is required').not().isEmpty()
  ],
  authController.verifyOtp
);

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP for password reset
// @access  Public
router.post(
  '/resend-otp',
  [
    check('email', 'Please include a valid email').isEmail()
  ],
  authController.resendOtp
);

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post(
  '/reset-password',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('otp', 'OTP is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
  ],
  authController.resetPassword
);

module.exports = router;
