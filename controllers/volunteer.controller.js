const Volunteer = require('../models/Volunteer');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get all volunteers
exports.getAllVolunteers = async (req, res) => {
  try {
    const volunteers = await Volunteer.find()
      .populate('user', ['name', 'email', 'profileImage']);
    res.json(volunteers);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get volunteer by ID
exports.getVolunteerById = async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id)
      .populate('user', ['name', 'email', 'profileImage']);
    
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    res.json(volunteer);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get volunteer profile for logged in user
exports.getMyVolunteerProfile = async (req, res) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user.id })
      .populate('user', ['name', 'email', 'profileImage']);
    
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer profile not found' });
    }

    res.json(volunteer);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create or update volunteer profile
exports.createVolunteerProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    skills,
    availability,
    address,
    location,
    phone,
    experience,
    emergencyContact
  } = req.body;

  // Build volunteer profile object
  const volunteerFields = {
    user: req.user.id,
    phone,
    isActive: true
  };

  if (skills) volunteerFields.skills = skills;
  if (availability) volunteerFields.availability = availability;
  if (address) volunteerFields.address = address;
  if (location) volunteerFields.location = location;
  if (experience) volunteerFields.experience = experience;
  if (emergencyContact) volunteerFields.emergencyContact = emergencyContact;

  try {
    // Check if user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Look for existing volunteer profile
    let volunteer = await Volunteer.findOne({ user: req.user.id });

    if (volunteer) {
      // Update existing profile
      volunteer = await Volunteer.findOneAndUpdate(
        { user: req.user.id },
        { $set: volunteerFields },
        { new: true }
      );
      return res.json(volunteer);
    }

    // Create new volunteer profile
    volunteer = new Volunteer(volunteerFields);
    await volunteer.save();
    
    // Update user role if needed
    if (user.role !== 'admin') {
      user.role = 'volunteer';
      await user.save();
    }

    res.json(volunteer);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update volunteer assignments
exports.updateAssignment = async (req, res) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user.id });
    
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer profile not found' });
    }

    const { requestId, assignmentModel, status } = req.body;

    // Find assignment if exists
    const assignmentIndex = volunteer.assignments.findIndex(
      a => a.requestId.toString() === requestId
    );

    if (assignmentIndex !== -1) {
      // Update existing assignment
      volunteer.assignments[assignmentIndex].status = status;
      if (status === 'completed') {
        volunteer.assignments[assignmentIndex].completedDate = Date.now();
      }
    } else {
      // Add new assignment
      volunteer.assignments.push({
        requestId,
        assignmentModel,
        status,
        assignedDate: Date.now()
      });
    }

    await volunteer.save();
    res.json(volunteer);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Find nearby volunteers
exports.findNearbyVolunteers = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance, skills } = req.query;
    
    // Convert parameters
    const coords = [parseFloat(longitude), parseFloat(latitude)];
    const distance = parseInt(maxDistance) || 10000; // Default 10km
    
    // Build query
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coords
          },
          $maxDistance: distance
        }
      },
      isActive: true
    };

    // Add skills filter if provided
    if (skills) {
      query.skills = { $in: skills.split(',') };
    }

    const volunteers = await Volunteer.find(query)
      .populate('user', ['name', 'email']);

    res.json(volunteers);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete volunteer profile
exports.deleteVolunteerProfile = async (req, res) => {
  try {
    // Remove volunteer profile
    await Volunteer.findOneAndRemove({ user: req.user.id });
    
    res.json({ message: 'Volunteer profile deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
