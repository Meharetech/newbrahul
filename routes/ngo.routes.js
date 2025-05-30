const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const ngoController = require('../controllers/ngo.controller');
const ngoLoginController = require('../controllers/ngo.login.controller');
const ngoStatusController = require('../controllers/ngo.status.controller');
const publicAccess = require('../middleware/publicAccess');

// @route   GET /api/ngos
// @desc    Get all NGOs
// @access  Public
router.get('/', ngoController.getAllNGOs);

// @route   GET /api/ngos/search
// @desc    Search NGOs by name
// @access  Public
router.get('/search', ngoController.searchNGOs);

// @route   GET /api/ngos/:id
// @desc    Get NGO by ID
// @access  Public
router.get('/:id', ngoController.getNGOById);

// @route   POST /api/ngos
// @desc    Register a new NGO
// @access  Public - No authentication required
router.post(
  '/',
  publicAccess,
  [
    check('name', 'NGO name is required').not().isEmpty(),
    check('phoneNumber', 'Phone number is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required and must be at least 6 characters').isLength({ min: 6 }),
    check('personalName', 'Personal contact name is required').not().isEmpty(),
    check('personalPhone', 'Personal contact number is required').not().isEmpty(),
    check('pincode', 'Pincode is required').not().isEmpty(),
    check('state', 'State is required').not().isEmpty(),
    check('city', 'City is required').not().isEmpty(),
    check('startDate', 'Start date is required').not().isEmpty()
  ],
  ngoController.registerNGO
);

// @route   POST /api/ngos/login
// @desc    Login NGO and get token
// @access  Public
router.post(
  '/login',
  publicAccess,
  [
    check('identifier', 'Email or phone number is required').not().isEmpty(),
    check('password', 'Password is required').exists()
  ],
  ngoLoginController.loginNGO
);

// @route   PUT /api/ngos/:id/status
// @desc    Update NGO status (approve/reject)
// @access  Private - Admin only
router.put(
  '/:id/status',
  [
    check('status', 'Status is required').not().isEmpty(),
    check('status', 'Status must be either approved or rejected').isIn(['approved', 'rejected', 'pending'])
  ],
  ngoStatusController.updateNGOStatus
);

module.exports = router;
