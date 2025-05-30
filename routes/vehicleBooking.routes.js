const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const vehicleBookingController = require('../controllers/vehicleBooking.controller');
const auth = require('../middleware/auth');
const vehicleAuth = require('../middleware/vehicleAuth');
const adminAuth = require('../middleware/adminAuth');

// @route   POST /api/vehicle/bookings
// @desc    Create a new vehicle booking
// @access  Private (Vehicle User)
router.post(
  '/',
  vehicleAuth,
  [
    check('pickupLocation', 'Pickup location is required').not().isEmpty(),
    check('dropLocation', 'Drop location is required').not().isEmpty(),
    check('date', 'Date is required').not().isEmpty(),
    check('time', 'Time is required').not().isEmpty()
  ],
  vehicleBookingController.createBooking
);

// @route   GET /api/vehicle/bookings/public-requests
// @desc    Get all public booking requests for vehicle owners
// @access  Private (Vehicle User)
router.get('/public-requests', vehicleAuth, vehicleBookingController.getPublicBookingRequests);

// @route   GET /api/vehicle/bookings/accepted
// @desc    Get all accepted bookings for a vehicle owner
// @access  Private (Vehicle User)
router.get('/accepted', vehicleAuth, vehicleBookingController.getAcceptedBookings);

// @route   GET /api/vehicle/bookings/user
// @desc    Get all bookings for a user
// @access  Private (Vehicle User)
router.get('/user', vehicleAuth, vehicleBookingController.getUserBookings);

// @route   GET /api/vehicle/bookings
// @desc    Get all bookings (admin only)
// @access  Private (Admin)
router.get('/', adminAuth, vehicleBookingController.getAllBookings);

// @route   GET /api/vehicle/bookings/:id
// @desc    Get booking by ID
// @access  Private (Vehicle User or Admin)
router.get('/:id', vehicleAuth, vehicleBookingController.getBookingById);

// @route   PUT /api/vehicle/bookings/respond/:id
// @desc    Accept or reject a booking request
// @access  Private (Vehicle User)
router.put(
  '/respond/:id',
  vehicleAuth,
  [
    check('status', 'Status is required').isIn(['approved', 'rejected']),
    check('vehicleId', 'Vehicle ID is required when approving').custom((value, { req }) => {
      if (req.body.status === 'approved' && !value) {
        throw new Error('Vehicle ID is required when approving a booking');
      }
      return true;
    })
  ],
  vehicleBookingController.respondToBookingRequest
);

// @route   PUT /api/vehicle/bookings/:id
// @desc    Update booking status
// @access  Private (Admin)
router.put(
  '/:id',
  adminAuth,
  [
    check('status', 'Status is required').isIn(['pending', 'approved', 'rejected', 'completed'])
  ],
  vehicleBookingController.updateBookingStatus
);

// @route   DELETE /api/vehicle/bookings/:id
// @desc    Delete booking
// @access  Private (Vehicle User or Admin)
router.delete('/:id', vehicleAuth, vehicleBookingController.deleteBooking);

module.exports = router;
