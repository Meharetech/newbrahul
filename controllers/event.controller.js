const Event = require('../models/Event');
const { validationResult } = require('express-validator');
const { notifyNearbyDonors } = require('../utils/notifications');

// @desc    Get all donation events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10, upcoming = false } = req.query;
    
    // Filter for upcoming events if requested
    const filter = upcoming ? { date: { $gte: new Date() } } : {};
    
    const events = await Event.find(filter)
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('organizer', 'name');
    
    const count = await Event.countDocuments(filter);
    
    res.json({
      events,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('volunteers', 'name');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json(event);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new donation event
// @route   POST /api/events
// @access  Private (Admin)
exports.createEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const {
    title,
    description,
    date,
    location,
    address,
    targetUnits,
    bloodTypesNeeded,
    requirements,
    contactInfo
  } = req.body;
  
  try {
    const newEvent = new Event({
      title,
      description,
      date,
      location,
      address,
      targetUnits,
      bloodTypesNeeded,
      requirements,
      contactInfo,
      organizer: req.user.id,
      status: 'scheduled'
    });
    
    const event = await newEvent.save();
    
    // Notify nearby donors about the new event
    if (event.location && event.location.coordinates) {
      await notifyNearbyDonors({
        location: event.location,
        bloodType: event.bloodTypesNeeded,
        urgency: 'normal'
      });
    }
    
    res.status(201).json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (Admin or Organizer)
exports.updateEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    let event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is admin or the organizer
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }
    
    // Update fields
    const updateFields = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (value !== undefined) {
        updateFields[key] = value;
      }
    }
    
    event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );
    
    res.json(event);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private (Admin or Organizer)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is admin or the organizer
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }
    
    await event.remove();
    
    res.json({ message: 'Event removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Register as volunteer for an event
// @route   POST /api/events/:id/volunteer
// @access  Private
exports.volunteerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is already a volunteer
    if (event.volunteers.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already registered as volunteer' });
    }
    
    // Add user to volunteers
    event.volunteers.push(req.user.id);
    await event.save();
    
    res.json(event);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Cancel volunteer registration
// @route   DELETE /api/events/:id/volunteer
// @access  Private
exports.cancelVolunteer = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is a volunteer
    if (!event.volunteers.includes(req.user.id)) {
      return res.status(400).json({ message: 'Not registered as volunteer' });
    }
    
    // Remove user from volunteers
    event.volunteers = event.volunteers.filter(
      volunteer => volunteer.toString() !== req.user.id
    );
    
    await event.save();
    
    res.json(event);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
