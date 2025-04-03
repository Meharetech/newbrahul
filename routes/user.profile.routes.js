const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check } = require('express-validator');
const userProfileController = require('../controllers/user.profile.controller');

// @route   GET /api/user/profile
// @desc    Get current user profile
// @access  Private
router.get('/', auth, userProfileController.getUserProfile);

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').optional(),
      check('email', 'Please include a valid email').optional().isEmail(),
      check('phone', 'Please enter a valid phone number').optional(),
      check('password', 'Password must be at least 6 characters').optional().isLength({ min: 6 }),
      check('bloodGroup', 'Blood group must be valid').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
      check('age', 'Age must be a number between 18 and 65').optional().isInt({ min: 18, max: 65 }),
      check('gender', 'Gender must be valid').optional().isIn(['Male', 'Female', 'Other']),
      check('isAvailable', 'Availability must be a boolean').optional().isBoolean()
    ]
  ],
  userProfileController.updateUserProfile
);

module.exports = router;
