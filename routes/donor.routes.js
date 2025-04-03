const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const donorController = require('../controllers/donor.controller');
const auth = require('../middleware/auth');

// @route   GET /api/donors
// @desc    Get all donors
// @access  Public
router.get('/', donorController.getAllDonors);

// @route   GET /api/donors/me
// @desc    Get current user's donor profile
// @access  Private
router.get('/me', auth, donorController.getMyDonorProfile);

// @route   GET /api/donors/:id
// @desc    Get donor by ID
// @access  Public
router.get('/:id', donorController.getDonorById);

// @route   POST /api/donors
// @desc    Create or update donor profile
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('bloodType', 'Blood type is required').not().isEmpty(),
      check('age', 'Age is required').isNumeric(),
      check('weight', 'Weight is required').isNumeric(),
      check('gender', 'Gender is required').not().isEmpty(),
      check('phone', 'Phone number is required').not().isEmpty()
    ]
  ],
  donorController.createDonorProfile
);

// @route   PUT /api/donors/donation
// @desc    Add donation to history
// @access  Private
router.put(
  '/donation',
  [
    auth,
    [
      check('date', 'Date is required').not().isEmpty(),
      check('location', 'Location is required').not().isEmpty(),
      check('bloodBank', 'Blood bank name is required').not().isEmpty(),
      check('amount', 'Amount is required').isNumeric()
    ]
  ],
  donorController.updateDonationHistory
);

// @route   GET /api/donors/nearby
// @desc    Find nearby donors
// @access  Private
router.get('/nearby', auth, donorController.findNearbyDonors);

// @route   DELETE /api/donors
// @desc    Delete donor profile
// @access  Private
router.delete('/', auth, donorController.deleteDonorProfile);

module.exports = router;
