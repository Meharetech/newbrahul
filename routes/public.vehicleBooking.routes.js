const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { checkBookingsByPhone } = require('../controllers/vehicleBooking.controller');
const VehicleBooking = require('../models/VehicleBooking');

// @route   GET /api/public/vehicle-bookings/check/:phoneNumber
// @desc    Check bookings by phone number
// @access  Public
router.get('/vehicle-bookings/check/:phoneNumber', checkBookingsByPhone);

// @route   POST /api/public/vehicle-bookings
// @desc    Create a new vehicle booking without authentication
// @access  Public
router.post(
  '/vehicle-bookings',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('contactNumber', 'Please enter a valid 10-digit contact number').matches(/^[0-9]{10}$/),
    check('pickupLocation', 'Pickup location is required').not().isEmpty(),
    check('pickupState', 'Pickup state is required').not().isEmpty(),
    check('pickupCity', 'Pickup city is required').not().isEmpty(),
    check('dropLocation', 'Drop location is required').not().isEmpty(),
    check('dropState', 'Drop state is required').not().isEmpty(),
    check('dropCity', 'Drop city is required').not().isEmpty(),
    check('date', 'Date is required').not().isEmpty(),
    check('time', 'Time is required').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        name,
        email,
        contactNumber,
        pickupLocation,
        pickupState,
        pickupCity,
        pickupCoordinates,
        dropLocation,
        dropState,
        dropCity,
        date,
        time,
        passengers,
        purpose,
        additionalInfo
      } = req.body;
      
      console.log('Received pickup coordinates:', pickupCoordinates);

      // Create a new public booking request
      const newBooking = new VehicleBooking({
        publicRequest: true,
        name,
        email,
        contactNumber,
        pickupLocation,
        pickupState,
        pickupCity,
        pickupCoordinates: pickupCoordinates && pickupCoordinates.latitude && pickupCoordinates.longitude
          ? {
              latitude: Number(pickupCoordinates.latitude),
              longitude: Number(pickupCoordinates.longitude)
            }
          : { latitude: null, longitude: null },
        dropLocation,
        dropState,
        dropCity,
        date,
        time,
        passengers: passengers || 1,
        purpose: purpose || '',
        additionalInfo: additionalInfo || '',
        status: 'pending'
      });
      
      console.log('Saving booking with coordinates:', newBooking.pickupCoordinates);

      const booking = await newBooking.save();

      res.status(201).json({
        success: true,
        message: 'Vehicle booking request created successfully',
        data: booking
      });
    } catch (err) {
      console.error('Error creating public vehicle booking:', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: err.message
      });
    }
  }
);

module.exports = router;
