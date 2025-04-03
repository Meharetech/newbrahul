const User = require('../models/User');
const Donor = require('../models/Donor');
const Donation = require('../models/Donation');
const BloodRequest = require('../models/BloodRequest');
const bcrypt = require('bcryptjs');

// @route   GET /api/admin/donors
// @desc    Get all donors
// @access  Private (Admin only)
exports.getAllDonors = async (req, res) => {
  try {
    // Find all users with role 'donor' and populate donor profile data
    const donors = await User.find({ role: 'donor' })
      .select('-password')
      .lean();

    // Get donor profiles for additional information
    const donorIds = donors.map(donor => donor._id);
    const donorProfiles = await Donor.find({ user: { $in: donorIds } }).lean();

    // Create a map of donor profiles by user ID for quick lookup
    const donorProfileMap = {};
    donorProfiles.forEach(profile => {
      donorProfileMap[profile.user.toString()] = profile;
    });

    // Enhance donor data with profile information
    const enhancedDonors = donors.map(donor => {
      const profile = donorProfileMap[donor._id.toString()];
      return {
        ...donor,
        isAvailable: profile ? profile.isAvailable : false,
        lastDonationDate: profile ? profile.lastDonationDate : null,
        donationCount: profile ? profile.donationCount : 0,
        // Ensure bloodGroup is properly set
        bloodGroup: donor.bloodGroup || (profile && profile.bloodType) || 'Unknown'
      };
    });

    // Get total count
    const totalDonors = await User.countDocuments({ role: 'donor' });
    
    // Get available donors (those who are eligible to donate)
    const availableDonors = await Donor.countDocuments({ 
      eligibleToDonateDate: { $lte: new Date() },
      isAvailable: true
    });

    // Calculate blood group distribution
    const bloodGroupDistribution = {
      'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
    };

    enhancedDonors.forEach(donor => {
      if (donor.bloodGroup && bloodGroupDistribution.hasOwnProperty(donor.bloodGroup)) {
        bloodGroupDistribution[donor.bloodGroup]++;
      }
    });

    res.json({
      donors: enhancedDonors,
      totalDonors,
      availableDonors,
      bloodGroupDistribution
    });
  } catch (err) {
    console.error('Error in getAllDonors:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/admin/donors
// @desc    Create a new donor
// @access  Private (Admin only)
exports.createDonor = async (req, res) => {
  try {
    const { 
      name, email, phone, bloodGroup, age, gender, address, 
      state, city, pincode, isAvailable, weight, allergies, 
      medicalConditions, lastHealthCheck, password = 'Donor@123' 
    } = req.body;

    console.log('Creating donor with data:', req.body);

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create new user with role 'donor'
    // No need to hash the password manually, the User model's pre-save hook will handle it
    const newUser = new User({
      name,
      email,
      password, // Password will be hashed by the pre-save hook in the User model
      phone,
      bloodGroup,
      age,
      gender,
      address,
      state,
      city,
      pincode,
      role: 'donor',
      roles: ['donor'] // Add donor role
    });

    await newUser.save();

    // Create donor profile
    const newDonor = new Donor({
      user: newUser._id,
      bloodType: bloodGroup,
      age: age || 18,
      weight: weight || 50,
      gender: gender ? gender.toLowerCase() : 'other',
      phone,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      allergies,
      medicalConditions,
      lastHealthCheck: lastHealthCheck ? new Date(lastHealthCheck) : null,
      address: {
        street: address,
        city,
        state,
        zipCode: pincode,
        country: 'India'
      }
    });

    await newDonor.save();

    // Return the new user (without password) and donor profile
    const userResponse = await User.findById(newUser._id).select('-password');
    
    console.log('Created donor successfully:', {
      user: {
        _id: userResponse._id,
        name: userResponse.name,
        email: userResponse.email
      },
      donor: {
        _id: newDonor._id,
        bloodType: newDonor.bloodType
      }
    });

    res.status(201).json({
      message: 'Donor created successfully',
      user: userResponse,
      profile: newDonor
    });
  } catch (err) {
    console.error('Error in createDonor:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/admin/donors/search
// @desc    Search donors by email or phone
// @access  Private (Admin only)
exports.searchDonors = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Search users with role 'donor' by email or phone
    const donors = await User.find({
      role: 'donor',
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ]
    }).select('-password');

    res.json(donors);
  } catch (err) {
    console.error('Error in searchDonors:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/admin/donors/:id
// @desc    Get donor details by ID
// @access  Private (Admin only)
exports.getDonorById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user with role 'donor' by ID - include all fields
    const user = await User.findOne({ _id: userId, role: 'donor' })
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    // Get donor profile data
    const donorProfile = await Donor.findOne({ user: userId }).lean();

    // Ensure blood group is properly set
    if (!user.bloodGroup && donorProfile && donorProfile.bloodType) {
      user.bloodGroup = donorProfile.bloodType;
    }

    // Ensure gender is properly set
    if (!user.gender && donorProfile && donorProfile.gender) {
      // Convert donor profile gender format to user gender format if needed
      const genderMap = {
        'male': 'Male',
        'female': 'Female',
        'other': 'Other'
      };
      user.gender = genderMap[donorProfile.gender] || donorProfile.gender;
    }

    // Ensure age is properly set
    if (!user.age && donorProfile && donorProfile.age) {
      user.age = donorProfile.age;
    }

    // Ensure address is properly set
    if (!user.address && donorProfile && donorProfile.address) {
      // If donor profile has structured address, create a formatted address string
      if (typeof donorProfile.address === 'object') {
        const addr = donorProfile.address;
        user.address = [
          addr.street,
          addr.city && addr.state ? `${addr.city}, ${addr.state}` : (addr.city || addr.state),
          addr.zipCode,
          addr.country
        ].filter(Boolean).join(', ');
        
        // Also set individual address components if available
        if (addr.city) user.city = addr.city;
        if (addr.state) user.state = addr.state;
        if (addr.zipCode) user.pincode = addr.zipCode;
      }
    }

    // Get donation count and last donation date if not in profile
    if (donorProfile) {
      if (!donorProfile.donationCount) {
        const donationCount = await Donation.countDocuments({ donor: userId });
        donorProfile.donationCount = donationCount;
      }

      if (!donorProfile.lastDonationDate) {
        const lastDonation = await Donation.findOne({ donor: userId })
          .sort({ donationDate: -1 })
          .lean();
        
        if (lastDonation) {
          donorProfile.lastDonationDate = lastDonation.donationDate;
        }
      }
    }

    // Log what we're sending back for debugging
    console.log('Sending donor details:', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        bloodGroup: user.bloodGroup,
        age: user.age,
        gender: user.gender,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode
      },
      profile: donorProfile ? {
        isAvailable: donorProfile.isAvailable,
        donationCount: donorProfile.donationCount,
        lastDonationDate: donorProfile.lastDonationDate,
        allergies: donorProfile.allergies,
        medicalConditions: donorProfile.medicalConditions,
        weight: donorProfile.weight
      } : {}
    });

    res.json({
      user,
      profile: donorProfile || {}
    });
  } catch (err) {
    console.error('Error in getDonorById:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/admin/donors/:id/donations
// @desc    Get donation history for a donor
// @access  Private (Admin only)
exports.getDonorDonationHistory = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user with role 'donor' by ID
    const user = await User.findOne({ _id: userId, role: 'donor' });

    if (!user) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    // Get all donations by this donor
    const donations = await Donation.find({ donor: userId })
      .sort({ donationDate: -1 }) // Sort by date, newest first
      .lean();

    // Enhance donation data with request information
    const enhancedDonations = await Promise.all(
      donations.map(async (donation) => {
        let requestInfo = {};
        
        if (donation.request) {
          // Get request details if available
          const request = await BloodRequest.findById(donation.request)
            .select('patientName hospital location')
            .lean();
            
          if (request) {
            requestInfo = {
              patientName: request.patientName,
              hospital: request.hospital,
              location: request.location
            };
          }
        }
        
        return {
          ...donation,
          ...requestInfo,
          requestId: donation.request || null
        };
      })
    );

    res.json(enhancedDonations);
  } catch (err) {
    console.error('Error in getDonorDonationHistory:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   PUT /api/admin/donors/:id
// @desc    Update donor details
// @access  Private (Admin only)
exports.updateDonor = async (req, res) => {
  try {
    const { 
      name, email, phone, bloodGroup, age, gender, address, 
      state, city, pincode, isAvailable, weight, allergies, 
      medicalConditions, lastHealthCheck 
    } = req.body;

    console.log('Updating donor with data:', req.body);

    // Find the user by ID
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the donor profile
    const donorProfile = await Donor.findOne({ user: req.params.id });
    if (!donorProfile) {
      return res.status(404).json({ message: 'Donor profile not found' });
    }

    // Update user details
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (bloodGroup) user.bloodGroup = bloodGroup; // Update blood group in User model
    if (age) user.age = age;
    if (gender) user.gender = gender;
    if (address) user.address = address;
    
    // Handle state and city as direct text inputs
    if (state) user.state = state;
    if (city) user.city = city;
    if (pincode) user.pincode = pincode;

    await user.save();

    // Update donor profile
    if (bloodGroup) donorProfile.bloodType = bloodGroup; // Ensure blood type is synchronized in Donor model
    if (isAvailable !== undefined) donorProfile.isAvailable = isAvailable;
    if (weight) donorProfile.weight = weight;
    if (allergies !== undefined) donorProfile.allergies = allergies;
    if (medicalConditions !== undefined) donorProfile.medicalConditions = medicalConditions;
    if (lastHealthCheck) donorProfile.lastHealthCheck = new Date(lastHealthCheck);
    
    // Update address in donor profile if structured address is used
    if (address || state || city) {
      if (!donorProfile.address || typeof donorProfile.address !== 'object') {
        donorProfile.address = {};
      }
      
      if (address) donorProfile.address.street = address;
      if (state) donorProfile.address.state = state;
      if (city) donorProfile.address.city = city;
      if (pincode) donorProfile.address.zipCode = pincode;
    }

    await donorProfile.save();

    // Return updated user and profile
    const updatedUser = await User.findById(req.params.id).select('-password');
    const updatedProfile = await Donor.findOne({ user: req.params.id });

    console.log('Updated donor successfully:', {
      user: {
        name: updatedUser.name,
        state: updatedUser.state,
        city: updatedUser.city
      },
      profile: {
        address: updatedProfile.address
      }
    });

    res.json({
      message: 'Donor updated successfully',
      user: updatedUser,
      profile: updatedProfile
    });
  } catch (err) {
    console.error('Error in updateDonor:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   DELETE /api/admin/donors/:id
// @desc    Delete donor
// @access  Private (Admin only)
exports.deleteDonor = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user with role 'donor' by ID
    const user = await User.findOne({ _id: userId, role: 'donor' });

    if (!user) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    // Delete donor profile
    await Donor.findOneAndDelete({ user: userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'Donor deleted successfully' });
  } catch (err) {
    console.error('Error in deleteDonor:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
