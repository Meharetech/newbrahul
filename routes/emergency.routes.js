const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const emergencyController = require('../controllers/emergency.controller');
const auth = require('../middleware/auth');

// @route   GET /api/emergency
// @desc    Get all active emergency requests
// @access  Public
router.get('/', emergencyController.getActiveRequests);

// @route   GET /api/emergency/:id
// @desc    Get emergency request by ID
// @access  Public
router.get('/:id', emergencyController.getRequestById);

// @route   POST /api/emergency
// @desc    Create new emergency request
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('patientName', 'Patient name is required').not().isEmpty(),
      check('bloodType', 'Blood type is required').not().isEmpty(),
      check('unitsNeeded', 'Number of units needed is required').isNumeric(),
      check('hospital', 'Hospital information is required').not().isEmpty(),
      check('location', 'Location is required').not().isEmpty(),
      check('reason', 'Reason is required').not().isEmpty(),
      check('contactInfo', 'Contact information is required').not().isEmpty()
    ]
  ],
  emergencyController.createRequest
);

// @route   PUT /api/emergency/:id/status
// @desc    Update emergency request status
// @access  Private
router.put(
  '/:id/status',
  [
    auth,
    check('status', 'Status is required').isIn(['active', 'fulfilled', 'expired'])
  ],
  emergencyController.updateStatus
);

// @route   PUT /api/emergency/:id/respond/:donorId
// @desc    Respond to emergency request (donor)
// @access  Private
router.put(
  '/:id/respond/:donorId',
  [
    auth,
    check('status', 'Status is required').isIn(['responding', 'arrived', 'donated', 'cancelled'])
  ],
  emergencyController.respondToRequest
);

// @route   GET /api/emergency/nearby
// @desc    Find nearby emergency requests
// @access  Private
router.get('/nearby', auth, emergencyController.findNearbyRequests);

module.exports = router;
