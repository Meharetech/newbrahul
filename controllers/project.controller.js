const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const NGO = require('../models/NGO');

/**
 * @desc    Create a new project
 * @route   POST /api/projects
 * @access  Private (NGO only)
 */
exports.createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Get NGO ID from authenticated user
    const ngoId = req.ngo.id;

    // Check if NGO exists
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({ msg: 'NGO not found' });
    }

    // Create new project
    const {
      title,
      description,
      category,
      location,
      startDate,
      endDate,
      goalType,
      goalAmount,
      beneficiaries,
      status,
      image,
      documents,
      callToAction,
      visibility
    } = req.body;

    const newProject = new Project({
      ngo: ngoId,
      title,
      description,
      category,
      location,
      startDate,
      endDate,
      goalType,
      goalAmount: goalAmount || 0,
      beneficiaries,
      status: status || 'pending', // Default to 'pending' instead of 'draft' if not specified
      image,
      documents,
      callToAction: {
        buttonText: callToAction?.buttonText || 'Support Now',
        buttonLink: callToAction?.buttonLink || ''
      },
      visibility: visibility || 'public'
    });

    const project = await newProject.save();
    res.status(201).json(project);
  } catch (err) {
    console.error('Error creating project:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

/**
 * @desc    Get all projects for an NGO
 * @route   GET /api/projects
 * @access  Private (NGO only)
 */
exports.getNGOProjects = async (req, res) => {
  try {
    // Get NGO ID from authenticated user
    const ngoId = req.ngo.id;
    console.log(`Fetching projects for NGO ID: ${ngoId}`);
    
    // Get NGO details to include in response
    const ngo = await NGO.findById(ngoId).select('-password');
    if (!ngo) {
      return res.status(404).json({ msg: 'NGO not found' });
    }
    
    // Find all projects for this NGO
    const projects = await Project.find({ ngo: ngoId }).sort({ createdAt: -1 });
    console.log(`Found ${projects.length} projects for NGO: ${ngo.name}`);
    
    // Return projects with NGO details
    res.json({
      ngo: {
        id: ngo._id,
        name: ngo.name,
        email: ngo.email,
        logo: ngo.logo
      },
      projects: projects,
      count: projects.length
    });
  } catch (err) {
    console.error('Error fetching NGO projects:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

/**
 * @desc    Get project by ID
 * @route   GET /api/projects/:id
 * @access  Private (NGO only)
 */
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Check if the project belongs to the authenticated NGO
    if (project.ngo.toString() !== req.ngo.id) {
      return res.status(401).json({ msg: 'Not authorized to access this project' });
    }

    res.json(project);
  } catch (err) {
    console.error('Error fetching project:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }
    
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

/**
 * @desc    Update project
 * @route   PUT /api/projects/:id
 * @access  Private (NGO only)
 */
exports.updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Check if the project belongs to the authenticated NGO
    if (project.ngo.toString() !== req.ngo.id) {
      return res.status(401).json({ msg: 'Not authorized to update this project' });
    }

    // Update project fields
    const updateFields = { ...req.body, updatedAt: Date.now() };
    
    // Handle nested callToAction object
    if (req.body.callToAction) {
      updateFields.callToAction = {
        ...project.callToAction,
        ...req.body.callToAction
      };
    }

    project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    res.json(project);
  } catch (err) {
    console.error('Error updating project:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }
    
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

/**
 * @desc    Delete project
 * @route   DELETE /api/projects/:id
 * @access  Private (NGO only)
 */
exports.deleteProject = async (req, res) => {
  try {
    console.log('Delete project request received for ID:', req.params.id);
    console.log('Authenticated NGO ID:', req.ngo.id);
    
    // First check if the project exists
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      console.log(`Project with ID ${req.params.id} not found`);
      return res.status(404).json({
        success: false,
        msg: 'Project not found'
      });
    }

    console.log('Project found:', project._id);
    console.log('Project NGO:', project.ngo);
    console.log('Authenticated NGO ID:', req.ngo.id);

    // Check if the project belongs to the authenticated NGO
    const projectNgoId = project.ngo.toString();
    if (projectNgoId !== req.ngo.id) {
      console.log(`Authorization failed: Project NGO (${projectNgoId}) does not match authenticated NGO (${req.ngo.id})`);
      return res.status(401).json({
        success: false,
        msg: 'Not authorized to delete this project'
      });
    }

    // Use findByIdAndDelete instead of remove() which is deprecated
    const deletedProject = await Project.findByIdAndDelete(req.params.id);
    
    if (!deletedProject) {
      console.log(`Failed to delete project with ID ${req.params.id}`);
      return res.status(500).json({
        success: false,
        msg: 'Failed to delete project'
      });
    }
    
    console.log(`Project ${req.params.id} deleted successfully`);
    res.status(200).json({ 
      success: true,
      msg: 'Project removed',
      data: { id: req.params.id }
    });
  } catch (err) {
    console.error('Error deleting project:', err);
    
    if (err.kind === 'ObjectId' || err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        msg: 'Project not found or invalid ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: err.message
    });
  }
};

/**
 * @desc    Get public projects
 * @route   GET /api/projects/public
 * @access  Public
 */
exports.getPublicProjects = async (req, res) => {
  try {
    const projects = await Project.find({ 
      visibility: 'public',
      status: 'active'
    })
    .populate('ngo', 'name logo')
    .sort({ createdAt: -1 });
    
    res.json(projects);
  } catch (err) {
    console.error('Error fetching public projects:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
