const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const projectController = require('../controllers/project.controller');
const ngoAuth = require('../middleware/ngoAuth');
const publicAccess = require('../middleware/publicAccess');

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private (NGO only)
router.post(
  '/',
  ngoAuth,
  [
    check('title', 'Title is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('category', 'Category is required').not().isEmpty(),
    check('location', 'Location is required').not().isEmpty(),
    check('startDate', 'Start date is required').not().isEmpty(),
    check('endDate', 'End date is required').not().isEmpty(),
    check('goalType', 'Goal type is required').not().isEmpty(),
    check('beneficiaries', 'Beneficiaries information is required').not().isEmpty()
  ],
  projectController.createProject
);

// @route   GET /api/projects
// @desc    Get all projects for an NGO
// @access  Private (NGO only)
router.get('/', ngoAuth, projectController.getNGOProjects);

// @route   GET /api/projects/public
// @desc    Get public projects
// @access  Public
router.get('/public', publicAccess, projectController.getPublicProjects);

// @route   GET /api/projects/:id
// @desc    Get project by ID
// @access  Private (NGO only)
router.get('/:id', ngoAuth, projectController.getProjectById);

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private (NGO only)
router.put('/:id', ngoAuth, projectController.updateProject);

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private (NGO only)
router.delete('/:id', ngoAuth, projectController.deleteProject);

module.exports = router;
