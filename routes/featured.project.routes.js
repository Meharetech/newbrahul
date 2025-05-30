const express = require('express');
const router = express.Router();
const featuredProjectController = require('../controllers/featured.project.controller');
const adminAuth = require('../middleware/adminAuth');

// @route   GET /api/projects/featured
// @desc    Get all featured projects for homepage
// @access  Public
router.get('/featured', featuredProjectController.getFeaturedProjects);

// @route   PATCH /api/admin/projects/:id/featured
// @desc    Toggle project featured status (admin only)
// @access  Private (Admin only)
router.patch('/admin/projects/:id/featured', adminAuth, featuredProjectController.toggleProjectFeatured);

module.exports = router;
