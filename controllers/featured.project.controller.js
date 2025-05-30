const Project = require('../models/Project');

/**
 * @desc    Get all featured projects for homepage
 * @route   GET /api/projects/featured
 * @access  Public
 */
exports.getFeaturedProjects = async (req, res) => {
  try {
    // Fetch all featured projects with active status
    const featuredProjects = await Project.find({ 
      featured: true,
      status: 'active',
      visibility: 'public'
    })
    .populate('ngo', 'name logo')
    .sort({ createdAt: -1 })
    .limit(10);
    
    res.json(featuredProjects);
  } catch (err) {
    console.error('Error fetching featured projects:', err.message);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: err.message 
    });
  }
};

/**
 * @desc    Toggle project featured status (admin only)
 * @route   PATCH /api/admin/projects/:id/featured
 * @access  Private (Admin only)
 */
exports.toggleProjectFeatured = async (req, res) => {
  try {
    const { featured } = req.body;
    
    if (featured === undefined) {
      return res.status(400).json({ 
        success: false,
        msg: 'Featured status is required' 
      });
    }
    
    // Find project by ID
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ 
        success: false,
        msg: 'Project not found' 
      });
    }
    
    // Update featured status
    project.featured = featured;
    project.updatedAt = Date.now();
    await project.save();
    
    res.json({
      success: true,
      msg: `Project ${featured ? 'added to' : 'removed from'} featured projects`,
      project
    });
  } catch (err) {
    console.error('Error toggling project featured status:', err.message);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: err.message 
    });
  }
};
