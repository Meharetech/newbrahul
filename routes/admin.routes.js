const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const adminHospitalController = require('../controllers/admin.hospital.controller');
const adminVehicleController = require('../controllers/admin.vehicle.controller');
const adminAuth = require('../middleware/adminAuth');

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  adminController.login
);

// @route   GET /api/admin/profile
// @desc    Get admin profile
// @access  Private (Admin only)
router.get('/profile', adminAuth, adminController.getProfile);

// @route   GET /api/admin/dashboard/stats
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard/stats', adminAuth, adminController.getDashboardStats);

// ===== Hospital Management Routes =====

// @route   GET /api/admin/hospitals
// @desc    Get all hospitals
// @access  Private (Admin only)
router.get('/hospitals', adminAuth, adminHospitalController.getAllHospitals);

// @route   GET /api/admin/hospitals/:id
// @desc    Get hospital by ID
// @access  Private (Admin only)
router.get('/hospitals/:id', adminAuth, adminHospitalController.getHospitalById);

// @route   PUT /api/admin/hospitals/:id/status
// @desc    Update hospital status (approve/reject)
// @access  Private (Admin only)
router.put(
  '/hospitals/:id/status',
  [
    adminAuth,
    check('status', 'Status is required').not().isEmpty(),
    check('status', 'Status must be pending, approved, or rejected').isIn(['pending', 'approved', 'rejected'])
  ],
  adminHospitalController.updateHospitalStatus
);

// @route   DELETE /api/admin/hospitals/:id
// @desc    Delete a hospital
// @access  Private (Admin only)
router.delete('/hospitals/:id', adminAuth, adminHospitalController.deleteHospital);

// ===== Vehicle Management Routes =====

// @route   GET /api/admin/vehicles
// @desc    Get all vehicles
// @access  Private (Admin only)
router.get('/vehicles', adminAuth, adminVehicleController.getAllVehicles);

// @route   GET /api/admin/vehicles/:id
// @desc    Get vehicle by ID
// @access  Private (Admin only)
router.get('/vehicles/:id', adminAuth, adminVehicleController.getVehicleById);

// @route   PUT /api/admin/vehicles/:id
// @desc    Update vehicle details
// @access  Private (Admin only)
router.put('/vehicles/:id', adminAuth, adminVehicleController.updateVehicle);

// @route   PUT /api/admin/vehicles/:id/status
// @desc    Update vehicle status (approve/reject)
// @access  Private (Admin only)
router.put(
  '/vehicles/:id/status',
  [
    adminAuth,
    check('status', 'Status is required').not().isEmpty(),
    check('status', 'Status must be active, inactive, pending, or rejected').isIn(['active', 'inactive', 'pending', 'rejected'])
  ],
  adminVehicleController.updateVehicleStatus
);

// @route   DELETE /api/admin/vehicles/:id
// @desc    Delete a vehicle
// @access  Private (Admin only)
router.delete('/vehicles/:id', adminAuth, adminVehicleController.deleteVehicle);

module.exports = router;
