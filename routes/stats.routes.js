const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// @route   GET /api/stats/overall
// @desc    Get overall platform statistics
// @access  Public
router.get('/overall', statsController.getOverallStats);

// @route   GET /api/stats/donor/:donorId
// @desc    Get donor statistics
// @access  Private
router.get('/donor/:donorId', auth, statsController.getDonorStats);

// @route   GET /api/stats/monthly
// @desc    Get monthly donation statistics
// @access  Private (Admin only)
router.get('/monthly', [auth, checkRole(['admin'])], statsController.getMonthlyStats);

// @route   GET /api/stats/location
// @desc    Get request statistics by location
// @access  Private (Admin only)
router.get('/location', [auth, checkRole(['admin'])], statsController.getLocationStats);

module.exports = router;
