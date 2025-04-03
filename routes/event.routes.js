const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const eventController = require('../controllers/event.controller');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// @route   GET /api/events
// @desc    Get all donation events
// @access  Public
router.get('/', eventController.getEvents);

// @route   GET /api/events/:id
// @desc    Get event by ID
// @access  Public
router.get('/:id', eventController.getEventById);

// @route   POST /api/events
// @desc    Create a new donation event
// @access  Private (Admin)
router.post(
  '/',
  [
    auth,
    checkRole(['admin']),
    [
      check('title', 'Title is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('date', 'Valid date is required').isISO8601().toDate(),
      check('location.coordinates', 'Location coordinates are required').isArray(),
      check('address.street', 'Street address is required').not().isEmpty(),
      check('address.city', 'City is required').not().isEmpty(),
      check('address.state', 'State is required').not().isEmpty(),
      check('address.zipCode', 'Zip code is required').not().isEmpty(),
      check('address.country', 'Country is required').not().isEmpty(),
      check('contactInfo.name', 'Contact name is required').not().isEmpty(),
      check('contactInfo.phone', 'Contact phone is required').not().isEmpty(),
      check('contactInfo.email', 'Valid contact email is required').isEmail()
    ]
  ],
  eventController.createEvent
);

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private (Admin or Organizer)
router.put(
  '/:id',
  [
    auth,
    [
      check('title', 'Title is required').optional().not().isEmpty(),
      check('description', 'Description is required').optional().not().isEmpty(),
      check('date', 'Valid date is required').optional().isISO8601().toDate(),
      check('location.coordinates', 'Location coordinates must be an array').optional().isArray(),
      check('address.street', 'Street address is required').optional().not().isEmpty(),
      check('address.city', 'City is required').optional().not().isEmpty(),
      check('address.state', 'State is required').optional().not().isEmpty(),
      check('address.zipCode', 'Zip code is required').optional().not().isEmpty(),
      check('address.country', 'Country is required').optional().not().isEmpty(),
      check('contactInfo.name', 'Contact name is required').optional().not().isEmpty(),
      check('contactInfo.phone', 'Contact phone is required').optional().not().isEmpty(),
      check('contactInfo.email', 'Valid contact email is required').optional().isEmail()
    ]
  ],
  eventController.updateEvent
);

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private (Admin or Organizer)
router.delete('/:id', auth, eventController.deleteEvent);

// @route   POST /api/events/:id/volunteer
// @desc    Register as volunteer for an event
// @access  Private
router.post('/:id/volunteer', auth, eventController.volunteerForEvent);

// @route   DELETE /api/events/:id/volunteer
// @desc    Cancel volunteer registration
// @access  Private
router.delete('/:id/volunteer', auth, eventController.cancelVolunteer);

module.exports = router;
