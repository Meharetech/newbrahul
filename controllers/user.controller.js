const User = require('../models/User');
const Donor = require('../models/Donor');

// @route   GET /api/users/me
// @desc    Get current user
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    // Get user with basic info but exclude password
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user is a donor, get donor profile info
    let donorProfile = null;
    if (user.roles && user.roles.includes('donor')) {
      donorProfile = await Donor.findOne({ user: req.user.id });
    }

    // Return user data with donor profile if exists
    res.json({
      user,
      donorProfile
    });
  } catch (err) {
    console.error('Error in getCurrentUser:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
