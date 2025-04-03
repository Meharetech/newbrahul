const User = require('../models/User');
const Donor = require('../models/Donor');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// @route   GET /api/user/profile
// @desc    Get current user profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    // Get user with basic info but exclude password
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user is a donor, get donor profile info
    let donorProfile = null;
    if (user.roles.includes('donor')) {
      donorProfile = await Donor.findOne({ user: req.user.id });
    }

    // Return user data with donor profile if exists
    res.json({
      user,
      donorProfile
    });
  } catch (err) {
    console.error('Error in getUserProfile:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    name,
    email,
    phone,
    address,
    bloodGroup,
    age,
    gender,
    password,
    isAvailable
  } = req.body;

  try {
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (bloodGroup) user.bloodGroup = bloodGroup;
    if (age) user.age = age;
    if (gender) user.gender = gender;

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    // If user is a donor and isAvailable is provided, update donor profile
    if (user.roles.includes('donor') && isAvailable !== undefined) {
      let donorProfile = await Donor.findOne({ user: req.user.id });
      
      if (donorProfile) {
        donorProfile.isAvailable = isAvailable;
        await donorProfile.save();
      } else {
        // Create donor profile if it doesn't exist
        donorProfile = new Donor({
          user: req.user.id,
          isAvailable
        });
        await donorProfile.save();
      }
    }

    // Get updated user without password
    const updatedUser = await User.findById(req.user.id).select('-password');
    
    // Get updated donor profile if exists
    let updatedDonorProfile = null;
    if (user.roles.includes('donor')) {
      updatedDonorProfile = await Donor.findOne({ user: req.user.id });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      donorProfile: updatedDonorProfile
    });
  } catch (err) {
    console.error('Error in updateUserProfile:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
