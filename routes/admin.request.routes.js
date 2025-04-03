const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminRequestController = require('../controllers/admin.request.controller');

// @route   GET /api/admin/requests
// @desc    Get all requests
// @access  Private (Admin only)
router.get('/', adminAuth, adminRequestController.getAllRequests);

// @route   GET /api/admin/requests/stats
// @desc    Get request statistics
// @access  Private (Admin only)
router.get('/stats', adminAuth, adminRequestController.getRequestStats);

// @route   GET /api/admin/requests/search
// @desc    Search requests by various criteria
// @access  Private (Admin only)
router.get('/search', adminAuth, adminRequestController.searchRequests);

// @route   POST /api/admin/requests
// @desc    Create a new request
// @access  Private (Admin only)
router.post('/', adminAuth, adminRequestController.createRequest);

// @route   GET /api/admin/requests/:id
// @desc    Get request details by ID
// @access  Private (Admin only)
router.get('/:id', adminAuth, adminRequestController.getRequestById);

// @route   PUT /api/admin/requests/:id/status
// @desc    Update request status only
// @access  Private (Admin only)
router.put('/:id/status', adminAuth, adminRequestController.updateRequestStatus);

// @route   PUT /api/admin/requests/:id
// @desc    Update request (full update)
// @access  Private (Admin only)
router.put('/:id', adminAuth, adminRequestController.updateRequest);

// @route   DELETE /api/admin/requests/:id
// @desc    Delete request
// @access  Private (Admin only)
router.delete('/:id', adminAuth, adminRequestController.deleteRequest);

module.exports = router;
