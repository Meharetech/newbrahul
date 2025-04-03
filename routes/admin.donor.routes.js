const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminDonorController = require('../controllers/admin.donor.controller');

// @route   GET /api/admin/donors
// @desc    Get all donors
// @access  Private (Admin only)
router.get('/', adminAuth, adminDonorController.getAllDonors);

// @route   POST /api/admin/donors
// @desc    Create a new donor
// @access  Private (Admin only)
router.post('/', adminAuth, adminDonorController.createDonor);

// @route   GET /api/admin/donors/search
// @desc    Search donors by email or phone
// @access  Private (Admin only)
router.get('/search', adminAuth, adminDonorController.searchDonors);

// @route   GET /api/admin/donors/:id
// @desc    Get donor details by ID
// @access  Private (Admin only)
router.get('/:id', adminAuth, adminDonorController.getDonorById);

// @route   GET /api/admin/donors/:id/donations
// @desc    Get donation history for a donor
// @access  Private (Admin only)
router.get('/:id/donations', adminAuth, adminDonorController.getDonorDonationHistory);

// @route   PUT /api/admin/donors/:id
// @desc    Update donor details
// @access  Private (Admin only)
router.put('/:id', adminAuth, adminDonorController.updateDonor);

// @route   DELETE /api/admin/donors/:id
// @desc    Delete donor
// @access  Private (Admin only)
router.delete('/:id', adminAuth, adminDonorController.deleteDonor);

module.exports = router;
