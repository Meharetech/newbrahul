const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const hospitalController = require('../controllers/hospital.controller');
const auth = require('../middleware/auth');

// @route   POST /api/hospitals/register
// @desc    Register a new hospital
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Hospital name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('phone', 'Phone number is required').not().isEmpty(),
    check('city', 'City is required').not().isEmpty(),
    check('state', 'State is required').not().isEmpty()
  ],
  hospitalController.register
);

// @route   POST /api/hospitals/login
// @desc    Login hospital
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  hospitalController.login
);

// @route   GET /api/hospitals/me
// @desc    Get current hospital profile
// @access  Private
router.get('/me', auth, hospitalController.getCurrentHospital);

// @route   PUT /api/hospitals/profile
// @desc    Update hospital profile
// @access  Private
router.put(
  '/profile',
  auth,
  [
    check('name', 'Hospital name is required').not().isEmpty(),
    check('phone', 'Phone number is required').not().isEmpty()
  ],
  hospitalController.updateProfile
);

// @route   GET /api/hospitals
// @desc    Get all hospitals
// @access  Public
router.get('/', hospitalController.getAllHospitals);

// @route   GET /api/hospitals/:id
// @desc    Get hospital by ID
// @access  Public
router.get('/:id', hospitalController.getHospitalById);

// @route   GET /api/hospitals/nearby
// @desc    Get nearby hospitals
// @access  Public
router.get('/nearby', hospitalController.getNearbyHospitals);

module.exports = router;
