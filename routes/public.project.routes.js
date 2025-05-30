const express = require('express');
const router = express.Router();
const featuredProjectController = require('../controllers/featured.project.controller');
const Project = require('../models/Project');

// @route   GET /api/public/projects/featured
// @desc    Get all featured projects for homepage
// @access  Public
router.get('/projects/featured', featuredProjectController.getFeaturedProjects);

// @route   GET /api/public/projects/active
// @desc    Get all active projects
// @access  Public
router.get('/projects/active', async (req, res) => {
  try {
    // Fetch all active and public projects
    const projects = await Project.find({ 
      status: 'active',
      visibility: 'public'
    })
    .populate('ngo', 'name logo')
    .sort({ createdAt: -1 });
    
    res.json(projects);
  } catch (err) {
    console.error('Error fetching active projects:', err.message);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: err.message 
    });
  }
});

// @route   GET /api/public/projects/:id
// @desc    Get a single project by ID
// @access  Public
router.get('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      status: 'active',
      visibility: 'public'
    }).populate('ngo', 'name logo');
    
    if (!project) {
      return res.status(404).json({
        success: false,
        msg: 'Project not found'
      });
    }
    
    res.json(project);
  } catch (err) {
    console.error('Error fetching project:', err.message);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: err.message 
    });
  }
});

module.exports = router;
