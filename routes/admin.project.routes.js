const express = require('express');
const router = express.Router();
const adminProjectController = require('../controllers/admin.project.controller');
const adminAuth = require('../middleware/adminAuth');

// @route   GET /api/admin/projects
// @desc    Get all projects (admin only)
// @access  Private (Admin only)
router.get('/projects', adminAuth, adminProjectController.getAllProjects);

// @route   GET /api/admin/projects/:id
// @desc    Get project details (admin only)
// @access  Private (Admin only)
router.get('/projects/:id', adminAuth, adminProjectController.getProjectDetails);

// @route   PATCH /api/admin/projects/:id/status
// @desc    Update project status (admin only)
// @access  Private (Admin only)
router.patch('/projects/:id/status', adminAuth, adminProjectController.updateProjectStatus);

module.exports = router;
