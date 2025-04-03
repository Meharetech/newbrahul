const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const volunteerController = require('../controllers/volunteer.controller');
const auth = require('../middleware/auth');

// @route   GET /api/volunteers
// @desc    Get all volunteers
// @access  Public
router.get('/', volunteerController.getAllVolunteers);

// @route   GET /api/volunteers/me
// @desc    Get current user's volunteer profile
// @access  Private
router.get('/me', auth, volunteerController.getMyVolunteerProfile);

// @route   GET /api/volunteers/:id
// @desc    Get volunteer by ID
// @access  Public
router.get('/:id', volunteerController.getVolunteerById);

// @route   POST /api/volunteers
// @desc    Create or update volunteer profile
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('phone', 'Phone number is required').not().isEmpty(),
      check('skills', 'Skills are required').isArray(),
      check('availability', 'Availability information is required').not().isEmpty(),
      check('location', 'Location is required').not().isEmpty()
    ]
  ],
  volunteerController.createVolunteerProfile
);

// @route   PUT /api/volunteers/assignment
// @desc    Update volunteer assignment
// @access  Private
router.put(
  '/assignment',
  [
    auth,
    [
      check('requestId', 'Request ID is required').not().isEmpty(),
      check('assignmentModel', 'Assignment model is required').isIn(['BloodRequest', 'EmergencyRequest']),
      check('status', 'Status is required').isIn(['assigned', 'completed', 'cancelled'])
    ]
  ],
  volunteerController.updateAssignment
);

// @route   GET /api/volunteers/nearby
// @desc    Find nearby volunteers
// @access  Private
router.get('/nearby', auth, volunteerController.findNearbyVolunteers);

// @route   DELETE /api/volunteers
// @desc    Delete volunteer profile
// @access  Private
router.delete('/', auth, volunteerController.deleteVolunteerProfile);

module.exports = router;
