const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const vehicleUserController = require('../controllers/vehicle.user.controller');
const vehicleAuth = require('../middleware/vehicleAuth');

// @route   POST /api/vehicle/user/register-vehicle
// @desc    Register a vehicle for a logged-in vehicle user
// @access  Private (vehicle user only)
router.post(
  '/register-vehicle',
  [
    vehicleAuth,
    check('vehicleType', 'Vehicle type is required').not().isEmpty(),
    check('licensePlate', 'License plate is required').not().isEmpty(),
    check('pincode', 'Pincode is required').not().isEmpty(),
    check('state', 'State is required').not().isEmpty(),
    check('city', 'City is required').not().isEmpty(),
    check('capacity', 'Capacity is required').not().isEmpty(),
    check('availabilityDate', 'Availability date is required').not().isEmpty(),
    check('availableDays', 'Available days is required').not().isEmpty()
  ],
  vehicleUserController.registerVehicle
);

// @route   GET /api/vehicle/user/my-vehicles
// @desc    Get all vehicles for the logged-in vehicle user
// @access  Private (vehicle user only)
router.get('/my-vehicles', vehicleAuth, vehicleUserController.getMyVehicles);

// @route   GET /api/vehicle/user/vehicles/:id
// @desc    Get a specific vehicle by ID for the logged-in vehicle user
// @access  Private (vehicle user only)
router.get('/vehicles/:id', vehicleAuth, vehicleUserController.getVehicleById);

// @route   PUT /api/vehicle/user/vehicles/:id
// @desc    Update a vehicle for the logged-in vehicle user
// @access  Private (vehicle user only)
router.put(
  '/vehicles/:id',
  [
    vehicleAuth,
    check('vehicleType', 'Vehicle type is required').optional(),
    check('pincode', 'Pincode is required').optional(),
    check('state', 'State is required').optional(),
    check('city', 'City is required').optional(),
    check('capacity', 'Capacity is required').optional().isNumeric(),
    check('availabilityDate', 'Availability date is required').optional(),
    check('availableDays', 'Available days is required').optional().isNumeric()
  ],
  vehicleUserController.updateVehicle
);

// @route   DELETE /api/vehicle/user/vehicles/:id
// @desc    Delete a vehicle for the logged-in vehicle user
// @access  Private (vehicle user only)
router.delete('/vehicles/:id', vehicleAuth, vehicleUserController.deleteVehicle);

module.exports = router;
