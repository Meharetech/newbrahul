const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const vehicleController = require('../controllers/vehicle.controller');
const auth = require('../middleware/auth');
const publicAccess = require('../middleware/publicAccess');

// @route   GET /api/vehicles
// @desc    Get all vehicles
// @access  Public
router.get('/', vehicleController.getAllVehicles);

// @route   GET /api/vehicles/me
// @desc    Get current user's vehicles
// @access  Private
router.get('/me', auth, vehicleController.getMyVehicles);

// @route   GET /api/vehicles/:id
// @desc    Get vehicle by ID
// @access  Public
router.get('/:id', vehicleController.getVehicleById);

// @route   POST /api/vehicles
// @desc    Register a new vehicle
// @access  Public - No authentication required
router.post(
  '/',
  publicAccess, // Use public access middleware instead of auth
  [
    check('ownerName', 'Owner name is required').not().isEmpty(),
    check('vehicleType', 'Vehicle type is required').not().isEmpty(),
    check('licensePlate', 'License plate is required').not().isEmpty(),
    check('pincode', 'Pincode is required').not().isEmpty(),
    check('state', 'State is required').not().isEmpty(),
    check('city', 'City is required').not().isEmpty(),
    check('capacity', 'Capacity is required').isNumeric(),
    check('contactNumber', 'Contact number is required').not().isEmpty(),
    check('availabilityDate', 'Availability date is required').not().isEmpty(),
    check('availableDays', 'Available days is required').isNumeric()
  ],
  vehicleController.registerVehicle
);

// @route   PUT /api/vehicles/:id
// @desc    Update vehicle
// @access  Private
router.put('/:id', auth, vehicleController.updateVehicle);

// @route   DELETE /api/vehicles/:id
// @desc    Delete vehicle
// @access  Private
router.delete('/:id', auth, vehicleController.deleteVehicle);

module.exports = router;
