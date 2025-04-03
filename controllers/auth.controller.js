const User = require('../models/User');
const Donor = require('../models/Donor');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { sendEmail, sendLoginNotification, sendRegistrationNotification } = require('../utils/email');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Store OTPs temporarily (in production, use Redis or a database)
const otpStore = new Map();

// Register a new user
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, 
      email, 
      password, 
      role,
      roles,
      phone,
      bloodGroup,
      dateOfBirth,
      address,
      age
    } = req.body;

    console.log(`Registration attempt for email: ${email}`);

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log(`Registration failed: User with email ${email} already exists`);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user with both roles by default
    user = new User({
      name,
      email,
      password,
      role: role || 'donor', // Default to donor if no role specified
      roles: roles || ['donor', 'requestor'], // By default, give users both roles
      phone
    });

    await user.save();
    console.log(`User created successfully: ${name} (${email})`);

    // Create donor profile regardless of role selection
    // Calculate age if not provided but dateOfBirth is
    let calculatedAge = age;
    if (!calculatedAge && dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
    }

    // Create donor profile
    const donorProfile = new Donor({
      user: user._id,
      bloodType: bloodGroup,
      age: calculatedAge || 18, // Default to 18 if not provided
      weight: req.body.weight || 50, // Use weight from form or default to 50
      gender: req.body.gender || 'other', // Use gender from form or default to 'other'
      phone: phone,
      address: address || {},
      location: {
        type: 'Point',
        coordinates: req.body.location?.coordinates || [77.2090, 28.6139] // Default coordinates (Delhi)
      },
    });

    await donorProfile.save();
    console.log(`Donor profile created for user: ${name} (${email})`);

    // Send registration confirmation email using dedicated function
    try {
      console.log(`Sending registration notification for ${email} using dedicated function`);
      
      const userData = {
        name,
        email,
        role: role || 'donor',
        bloodGroup
      };
      
      const emailResult = await sendRegistrationNotification(email, name, userData);
      
      if (emailResult) {
        console.log(`Registration notification sent successfully to ${email}`);
      } else {
        console.log(`Failed to send registration notification to ${email}`);
      }
    } catch (emailError) {
      console.error('Failed to send registration confirmation email:', emailError);
      // Continue execution even if email fails
    }

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        roles: user.roles
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ 
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            roles: user.roles,
            userType: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Login failed: User with email ${email} not found`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Login failed: Invalid password for user ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log(`Login successful for user: ${user.name} (${email})`);

    // Send login notification email using the dedicated function
    try {
      console.log(`Sending login notification for ${email} using dedicated function`);
      const loginTime = new Date();
      
      // Use the dedicated function for login notifications
      const emailResult = await sendLoginNotification(email, user.name, loginTime);
      
      if (emailResult) {
        console.log(`Login notification sent successfully to ${email}`);
      } else {
        console.log(`Failed to send login notification to ${email}`);
      }
    } catch (emailError) {
      console.error('Failed to send login notification email:', emailError);
      // Continue execution even if email fails
    }

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        roles: user.roles
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            roles: user.roles,
            userType: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Server error during login:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // Special handling for admin user
    if (req.isAdmin) {
      return res.json({
        _id: 'admin',
        name: 'Admin User',
        email: process.env.ADMIN_EMAIL || 'rahul@gmail.com',
        role: 'admin',
        roles: ['admin']
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure the current role is included in roles array
    if (user.role && !user.roles?.includes(user.role)) {
      user.roles = user.roles || [];
      if (!user.roles.includes(user.role)) {
        user.roles.push(user.role);
      }
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current authenticated user
exports.getCurrentUser = async (req, res) => {
  try {
    // Special handling for admin user
    if (req.isAdmin) {
      return res.json({
        _id: 'admin',
        name: 'Admin User',
        email: process.env.ADMIN_EMAIL || 'rahul@gmail.com',
        role: 'admin',
        roles: ['admin']
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get additional profile data based on user role
    let profileData = null;
    if (user.role === 'donor') {
      profileData = await Donor.findOne({ user: user._id });
    }
    // Add other role-specific profile data retrieval as needed

    res.json({
      user,
      profile: profileData
    });
  } catch (err) {
    console.error('Error in getCurrentUser:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    // Special handling for admin user
    if (req.isAdmin) {
      return res.status(403).json({ message: 'Admin profile cannot be updated through this endpoint' });
    }

    const { name, email, phone, profileImage } = req.body;
    
    // Build update object for User model
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    
    // Handle profile image - ensure it's not too large
    if (profileImage) {
      // If the image is a base64 string, process it
      if (profileImage.startsWith('data:image')) {
        // Remove the data:image prefix to reduce size
        const base64Data = profileImage.split(';base64,').pop();
        if (base64Data.length > 5 * 1024 * 1024) { // 5MB limit
          return res.status(413).json({ message: 'Profile image is too large. Please use a smaller image.' });
        }
        updateFields.profileImage = profileImage;
      } else {
        updateFields.profileImage = profileImage;
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    // Check if user has donor role (either as single role or in roles array)
    const isDonor = 
      user.role === 'donor' || 
      (user.roles && Array.isArray(user.roles) && user.roles.includes('donor'));

    // If user is a donor, update donor profile as well
    if (isDonor) {
      const { 
        bloodType, 
        age, 
        weight, 
        gender, 
        address, 
        location, 
        medicalHistory,
        emergencyContact,
        isAvailable
      } = req.body;

      // Find donor profile
      let donorProfile = await Donor.findOne({ user: user._id });

      if (donorProfile) {
        // Build update object for Donor model
        const donorUpdateFields = {};
        
        if (bloodType) donorUpdateFields.bloodType = bloodType;
        if (age) donorUpdateFields.age = age;
        if (weight) donorUpdateFields.weight = weight;
        if (gender) donorUpdateFields.gender = gender;
        if (phone) donorUpdateFields.phone = phone;
        if (isAvailable !== undefined) donorUpdateFields.isAvailable = isAvailable;
        
        // Handle nested objects
        if (address) {
          donorUpdateFields.address = {
            ...donorProfile.address,
            ...address
          };
        }
        
        if (location && location.coordinates) {
          donorUpdateFields.location = {
            type: 'Point',
            coordinates: location.coordinates
          };
        }
        
        if (medicalHistory) {
          donorUpdateFields.medicalHistory = {
            ...donorProfile.medicalHistory,
            ...medicalHistory
          };
        }
        
        if (emergencyContact) {
          donorUpdateFields.emergencyContact = {
            ...donorProfile.emergencyContact,
            ...emergencyContact
          };
        }

        // Update donor profile
        donorProfile = await Donor.findOneAndUpdate(
          { user: user._id },
          { $set: donorUpdateFields },
          { new: true }
        );
      } else {
        // If donor profile doesn't exist but user has donor role, create one
        donorProfile = new Donor({
          user: user._id,
          bloodType: bloodType || 'O+',
          age: age || 18,
          weight: weight || 50,
          gender: gender || 'other',
          phone: phone,
          address: address || {},
          location: {
            type: 'Point',
            coordinates: location?.coordinates || [77.2090, 28.6139]
          },
          medicalHistory: medicalHistory || {},
          emergencyContact: emergencyContact || {},
          isAvailable: isAvailable !== undefined ? isAvailable : true
        });
        
        await donorProfile.save();
      }

      // Return updated user and donor profile
      return res.json({
        user,
        profile: donorProfile
      });
    }

    // Return updated user
    res.json({ user });
  } catch (err) {
    console.error('Error updating profile:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get detailed profile information
exports.getDetailedProfile = async (req, res) => {
  try {
    // Special handling for admin user
    if (req.isAdmin) {
      return res.json({
        user: {
          _id: 'admin',
          name: 'Admin User',
          email: process.env.ADMIN_EMAIL || 'rahul@gmail.com',
          role: 'admin',
          roles: ['admin']
        },
        profile: null
      });
    }

    const user = await User.findById(req.user.id)
      .select('-password')
      .populate({
        path: 'notifications',
        options: { sort: { date: -1 }, limit: 5 }
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get additional profile data based on user role
    let profileData = null;
    let stats = {};
    
    // Check if user has donor role (either as single role or in roles array)
    const isDonor = 
      user.role === 'donor' || 
      (user.roles && Array.isArray(user.roles) && user.roles.includes('donor'));
    
    if (isDonor) {
      profileData = await Donor.findOne({ user: user._id })
        .populate({
          path: 'acceptedRequests.request',
          select: 'patientName bloodType hospital urgency requiredBy'
        });
      
      if (profileData) {
        // Calculate statistics
        stats = {
          totalDonations: profileData.donationHistory ? profileData.donationHistory.length : 0,
          pendingRequests: profileData.acceptedRequests ? 
            profileData.acceptedRequests.filter(r => r.status === 'accepted' || r.status === 'pending').length : 0,
          completedDonations: profileData.acceptedRequests ? 
            profileData.acceptedRequests.filter(r => r.status === 'donated').length : 0,
          lastDonation: profileData.donationHistory && profileData.donationHistory.length > 0 ? 
            profileData.donationHistory[profileData.donationHistory.length - 1].date : null
        };
      }
    }
    
    // Return detailed profile information
    res.json({
      user,
      profile: profileData,
      stats
    });
  } catch (err) {
    console.error('Error getting detailed profile:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    // Special handling for admin user
    if (req.isAdmin) {
      return res.status(403).json({ message: 'Admin password cannot be changed through this endpoint. Please update the .env file directly.' });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Switch user role
exports.switchRole = async (req, res) => {
  try {
    // Special handling for admin user
    if (req.isAdmin) {
      return res.status(403).json({ message: 'Admin role cannot be switched' });
    }

    const { role } = req.body;

    // Validate role
    if (!role || !['donor', 'requestor'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Get user and verify they have the role they're switching to
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.roles.includes(role)) {
      return res.status(403).json({ message: 'User does not have permission for this role' });
    }

    // Update user's current role
    user.role = role;
    await user.save();

    // Generate new JWT with updated role
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        roles: user.roles
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            roles: user.roles,
            userType: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password - send OTP
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate OTP (6 digits)
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Store OTP with expiry (10 minutes)
    otpStore.set(email, {
      otp,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes in milliseconds
      attempts: 0
    });

    // Send OTP email
    const htmlContent = `
      <h2 style="color: #e53e3e;">Password Reset Request</h2>
      <p>Dear ${user.name},</p>
      <p>We received a request to reset your password for your BloodHero account.</p>
      <p>Your verification code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 5px; text-align: center; padding: 10px; background-color: #f8f8f8; border-radius: 5px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
      <p>Thank you for using BloodHero!</p>
      <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
    `;

    await sendEmail(
      email,
      'BloodHero - Password Reset Verification Code',
      htmlContent
    );

    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Error in forgotPassword:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Check if OTP exists for this email
    const otpData = otpStore.get(email);
    if (!otpData) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
    }

    // Check if OTP is expired
    if (Date.now() > otpData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Increment attempts
    otpData.attempts += 1;

    // Check if too many attempts (max 5)
    if (otpData.attempts > 5) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'Too many invalid attempts. Please request a new OTP.' });
    }

    // Check if OTP matches
    if (otpData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // OTP is valid - mark as verified but don't delete yet (needed for reset password)
    otpData.verified = true;
    otpStore.set(email, otpData);

    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error('Error in verifyOtp:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend OTP
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new OTP (6 digits)
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Store OTP with expiry (10 minutes)
    otpStore.set(email, {
      otp,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes in milliseconds
      attempts: 0
    });

    // Send OTP email
    const htmlContent = `
      <h2 style="color: #e53e3e;">Password Reset Verification Code</h2>
      <p>Dear ${user.name},</p>
      <p>You requested a new verification code for your password reset.</p>
      <p>Your new verification code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 5px; text-align: center; padding: 10px; background-color: #f8f8f8; border-radius: 5px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>Thank you for using BloodHero!</p>
      <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
    `;

    await sendEmail(
      email,
      'BloodHero - New Password Reset Verification Code',
      htmlContent
    );

    res.json({ message: 'New OTP sent to your email' });
  } catch (err) {
    console.error('Error in resendOtp:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password with OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    // Check if OTP exists and is verified
    const otpData = otpStore.get(email);
    if (!otpData || !otpData.verified) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please restart the password reset process.' });
    }

    // Check if OTP matches
    if (otpData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // Check if OTP is expired
    if (Date.now() > otpData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Clear OTP
    otpStore.delete(email);

    // Send password changed confirmation email
    const htmlContent = `
      <h2 style="color: #e53e3e;">Password Changed Successfully</h2>
      <p>Dear ${user.name},</p>
      <p>Your password has been successfully reset.</p>
      <p>If you did not make this change, please contact support immediately.</p>
      <p>Thank you for using BloodHero!</p>
      <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
    `;

    await sendEmail(
      email,
      'BloodHero - Password Changed Successfully',
      htmlContent
    );

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Error in resetPassword:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
