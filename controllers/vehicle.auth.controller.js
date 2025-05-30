const VehicleUser = require('../models/VehicleUser');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../utils/email');

// @desc    Register vehicle owner
// @route   POST /api/vehicle/auth/register
// @access  Public
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, contactNumber, address, city, state, pincode, profileImage } = req.body;

  try {
    // Check if user already exists
    let vehicleUser = await VehicleUser.findOne({ email });
    if (vehicleUser) {
      return res.status(400).json({ message: 'Vehicle owner with this email already exists' });
    }

    // Create new vehicle user
    vehicleUser = new VehicleUser({
      name,
      email,
      password,
      contactNumber,
      address,
      city,
      state,
      pincode,
      profileImage: profileImage || ''
    });

    // Save user to database
    await vehicleUser.save();

    // Generate verification token
    const token = jwt.sign(
      { id: vehicleUser._id, role: 'vehicle-owner' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/vehicle/verify-email?token=${token}`;

    // Send email verification
    try {
      const emailSubject = 'Blood Hero - Verify Your Vehicle Owner Account';
      const emailHtml = `
          <h1>Welcome to Blood Hero!</h1>
          <p>Thank you for registering as a vehicle owner with our platform.</p>
          <p>Please verify your email by clicking the button below:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
          <p>If the button doesn't work, please copy and paste this link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>Thank you for joining our emergency transportation network!</p>
        `;
      
      await sendEmail(email, emailSubject, emailHtml);
    } catch (err) {
      console.error('Email sending error:', err);
      // Continue with registration even if email fails
    }

    // Create and return JWT token
    const authToken = vehicleUser.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token: authToken,
      user: {
        id: vehicleUser._id,
        name: vehicleUser.name,
        email: vehicleUser.email,
        role: vehicleUser.role,
        isVerified: vehicleUser.isVerified
      },
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Login vehicle owner
// @route   POST /api/vehicle/auth/login
// @access  Public
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check if user exists
    const vehicleUser = await VehicleUser.findOne({ email }).select('+password');
    if (!vehicleUser) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await vehicleUser.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create and return JWT token
    const token = vehicleUser.getSignedJwtToken();

    res.json({
      success: true,
      token,
      user: {
        id: vehicleUser._id,
        name: vehicleUser.name,
        email: vehicleUser.email,
        role: vehicleUser.role,
        isVerified: vehicleUser.isVerified
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get current vehicle owner profile
// @route   GET /api/vehicle/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const vehicleUser = await VehicleUser.findById(req.user.id).populate('vehicles');
    
    if (!vehicleUser) {
      return res.status(404).json({ message: 'Vehicle owner not found' });
    }

    res.json({
      success: true,
      data: vehicleUser
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Verify email
// @route   GET /api/vehicle/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ message: 'No verification token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by id
    const vehicleUser = await VehicleUser.findById(decoded.id);

    if (!vehicleUser) {
      return res.status(404).json({ message: 'Vehicle owner not found' });
    }

    // Update verification status
    vehicleUser.isVerified = true;
    await vehicleUser.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(400).json({ message: 'Invalid or expired token', error: err.message });
  }
};

// @desc    Update vehicle owner profile
// @route   PUT /api/vehicle/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  const { name, contactNumber, address, city, state, pincode, profileImage } = req.body;

  try {
    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (contactNumber) updateFields.contactNumber = contactNumber;
    if (address) updateFields.address = address;
    if (city) updateFields.city = city;
    if (state) updateFields.state = state;
    if (pincode) updateFields.pincode = pincode;
    if (profileImage) updateFields.profileImage = profileImage;

    // Update user
    const vehicleUser = await VehicleUser.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    );

    if (!vehicleUser) {
      return res.status(404).json({ message: 'Vehicle owner not found' });
    }

    res.json({
      success: true,
      data: vehicleUser,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Change password
// @route   PUT /api/vehicle/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Please provide current and new password' });
  }

  try {
    // Get user with password
    const vehicleUser = await VehicleUser.findById(req.user.id).select('+password');

    if (!vehicleUser) {
      return res.status(404).json({ message: 'Vehicle owner not found' });
    }

    // Check if current password matches
    const isMatch = await vehicleUser.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    vehicleUser.password = newPassword;
    await vehicleUser.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
