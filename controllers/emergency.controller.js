const EmergencyRequest = require('../models/EmergencyRequest');
const { validationResult } = require('express-validator');

// Get all active emergency requests
exports.getActiveRequests = async (req, res) => {
  try {
    const requests = await EmergencyRequest.find({
      status: 'active',
      expiresAt: { $gt: new Date() }
    })
      .populate('requestedBy', ['name', 'email'])
      .populate('responders.donor', ['user', 'bloodType']);
    
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get emergency request by ID
exports.getRequestById = async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id)
      .populate('requestedBy', ['name', 'email'])
      .populate('responders.donor', ['user', 'bloodType']);
    
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    res.json(request);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Emergency request not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new emergency request
exports.createRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    patientName,
    bloodType,
    unitsNeeded,
    hospital,
    location,
    reason,
    contactInfo,
    expiresAt
  } = req.body;

  try {
    const newRequest = new EmergencyRequest({
      requestedBy: req.user.id,
      patientName,
      bloodType,
      unitsNeeded,
      hospital,
      location,
      reason,
      contactInfo,
      expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24 hours
    });

    const request = await newRequest.save();
    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update emergency request status
exports.updateStatus = async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    // Check if user owns the request or is admin
    if (request.requestedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    request.status = req.body.status;
    await request.save();

    res.json(request);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Emergency request not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Respond to emergency request (donor)
exports.respondToRequest = async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    if (request.status !== 'active') {
      return res.status(400).json({ message: 'This request is no longer active' });
    }

    const { status } = req.body;
    
    // Check if donor already responded
    const responderIndex = request.responders.findIndex(
      r => r.donor.toString() === req.params.donorId
    );

    if (responderIndex !== -1) {
      // Update existing response
      request.responders[responderIndex].status = status;
    } else {
      // Add new response
      request.responders.push({
        donor: req.params.donorId,
        status,
        responseTime: Date.now()
      });
    }

    // Update request status if needed
    if (status === 'donated') {
      const donatedCount = request.responders.filter(r => r.status === 'donated').length;
      if (donatedCount >= request.unitsNeeded) {
        request.status = 'fulfilled';
      }
    }

    await request.save();
    res.json(request);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Emergency request not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Find nearby emergency requests
exports.findNearbyRequests = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance, bloodType } = req.query;
    
    // Convert parameters
    const coords = [parseFloat(longitude), parseFloat(latitude)];
    const distance = parseInt(maxDistance) || 10000; // Default 10km
    
    // Find active emergency requests near the coordinates
    const requests = await EmergencyRequest.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coords
          },
          $maxDistance: distance
        }
      },
      status: 'active',
      expiresAt: { $gt: new Date() },
      ...(bloodType && { bloodType })
    }).populate('requestedBy', ['name', 'email']);

    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
