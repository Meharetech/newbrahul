const Project = require('../models/Project');
const NGO = require('../models/NGO');

/**
 * @desc    Get all projects (for admin)
 * @route   GET /api/admin/projects
 * @access  Private (Admin only)
 */
exports.getAllProjects = async (req, res) => {
  try {
    console.log('Admin fetching all projects');
    
    // Fetch all projects and populate NGO information
    const projects = await Project.find()
      .populate('ngo', 'name email phone status')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${projects.length} projects`);
    res.json(projects);
  } catch (err) {
    console.error('Error fetching all projects:', err.message);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: err.message 
    });
  }
};

/**
 * @desc    Update project status (admin only)
 * @route   PATCH /api/admin/projects/:id/status
 * @access  Private (Admin only)
 */
exports.updateProjectStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false,
        msg: 'Status is required' 
      });
    }
    
    // Validate status value
    const validStatuses = ['draft', 'pending', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        msg: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    console.log(`Admin updating project ${req.params.id} status to ${status}`);
    
    // Find and update the project
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ 
        success: false,
        msg: 'Project not found' 
      });
    }
    
    // Update the status
    project.status = status;
    project.updatedAt = Date.now();
    
    await project.save();
    
    console.log(`Project ${req.params.id} status updated to ${status}`);
    
    res.json({ 
      success: true,
      msg: 'Project status updated successfully',
      project
    });
  } catch (err) {
    console.error('Error updating project status:', err.message);
    
    if (err.kind === 'ObjectId') {
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
 * @desc    Get project details (admin)
 * @route   GET /api/admin/projects/:id
 * @access  Private (Admin only)
 */
exports.getProjectDetails = async (req, res) => {
  try {
    console.log(`Admin fetching project ${req.params.id}`);
    
    const project = await Project.findById(req.params.id)
      .populate('ngo', 'name email phone status');
    
    if (!project) {
      return res.status(404).json({ 
        success: false,
        msg: 'Project not found' 
      });
    }
    
    res.json(project);
  } catch (err) {
    console.error('Error fetching project details:', err.message);
    
    if (err.kind === 'ObjectId') {
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
