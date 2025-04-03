const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const requesterDashboardController = require('../controllers/requester.dashboard.controller');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// @route   GET /api/dashboard/admin
// @desc    Get dashboard data for admin
// @access  Private (Admin)
router.get('/admin', [auth, checkRole(['admin'])], dashboardController.getAdminDashboard);

// @route   GET /api/dashboard/donor
// @desc    Get dashboard data for donor
// @access  Private
router.get('/donor', auth, dashboardController.getDonorDashboard);

// @route   GET /api/dashboard/hospital
// @desc    Get dashboard data for hospital
// @access  Private (Hospital)
router.get('/hospital', [auth, checkRole(['hospital'])], dashboardController.getHospitalDashboard);

// @route   GET /api/dashboard/requester
// @desc    Get dashboard data for requester
// @access  Private
router.get('/requester', auth, requesterDashboardController.getRequesterDashboard);

// @route   GET /api/dashboard/requester/active
// @desc    Get active requests for requester
// @access  Private
router.get('/requester/active', auth, requesterDashboardController.getActiveRequests);

// @route   GET /api/dashboard/requester/history
// @desc    Get request history for requester
// @access  Private
router.get('/requester/history', auth, requesterDashboardController.getRequestHistory);

// @route   GET /api/dashboard/user-stats
// @desc    Get comprehensive user statistics
// @access  Private
router.get('/user-stats', auth, dashboardController.getUserStatistics);

module.exports = router;
