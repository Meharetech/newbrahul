const Donor = require('../models/Donor');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get all donors
exports.getAllDonors = async (req, res) => {
  try {
    const donors = await Donor.find().populate('user', ['name', 'email', 'profileImage']);
    res.json(donors);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get donor by ID
exports.getDonorById = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id).populate('user', ['name', 'email', 'profileImage']);
    
    if (!donor) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    res.json(donor);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Donor not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get donor profile for logged in user
exports.getMyDonorProfile = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id }).populate('user', ['name', 'email', 'profileImage']);
    
    if (!donor) {
      return res.status(404).json({ message: 'Donor profile not found' });
    }

    res.json(donor);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create or update donor profile
exports.createDonorProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    bloodType,
    age,
    weight,
    gender,
    address,
    location,
    phone,
    medicalHistory,
    isAvailable,
    emergencyContact
  } = req.body;

  // Build donor profile object
  const donorFields = {
    user: req.user.id,
    bloodType,
    age,
    weight,
    gender,
    phone,
    isAvailable: isAvailable !== undefined ? isAvailable : true
  };

  if (address) donorFields.address = address;
  if (location) donorFields.location = location;
  if (medicalHistory) donorFields.medicalHistory = medicalHistory;
  if (emergencyContact) donorFields.emergencyContact = emergencyContact;

  try {
    // Check if user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Look for existing donor profile
    let donor = await Donor.findOne({ user: req.user.id });

    if (donor) {
      // Update existing profile
      donor = await Donor.findOneAndUpdate(
        { user: req.user.id },
        { $set: donorFields },
        { new: true }
      );
      return res.json(donor);
    }

    // Create new donor profile
    donor = new Donor(donorFields);
    await donor.save();
    
    // Update user role if needed
    if (user.role !== 'admin' && user.role !== 'volunteer') {
      user.role = 'donor';
      await user.save();
    }

    res.json(donor);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update donation history
exports.updateDonationHistory = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    
    if (!donor) {
      return res.status(404).json({ message: 'Donor profile not found' });
    }

    const { date, location, bloodBank, amount } = req.body;

    const newDonation = {
      date,
      location,
      bloodBank,
      amount
    };

    donor.donationHistory.unshift(newDonation);
    await donor.save();

    res.json(donor);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Find nearby donors
exports.findNearbyDonors = async (req, res) => {
  try {
    const { longitude, latitude, bloodType, maxDistance } = req.query;
    
    // Convert parameters
    const coords = [parseFloat(longitude), parseFloat(latitude)];
    const distance = parseInt(maxDistance) || 10000; // Default 10km
    
    // Find donors near the coordinates
    const donors = await Donor.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coords
          },
          $maxDistance: distance
        }
      },
      isAvailable: true,
      ...(bloodType && { bloodType })
    }).populate('user', ['name', 'email']);

    res.json(donors);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete donor profile
exports.deleteDonorProfile = async (req, res) => {
  try {
    // Remove donor profile
    await Donor.findOneAndRemove({ user: req.user.id });
    
    res.json({ message: 'Donor profile deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
