const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');

// @route   GET /api/admin/requests
// @desc    Get all blood requests
// @access  Private (Admin only)
exports.getAllRequests = async (req, res) => {
  try {
    // Find all requests with populated requester info
    const requests = await BloodRequest.find()
      .populate('requestedBy', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    // Get total count
    const totalRequests = await BloodRequest.countDocuments();
    
    // Get pending requests count
    const pendingRequests = await BloodRequest.countDocuments({ status: 'pending' });
    
    // Get urgent requests count
    const urgentRequests = await BloodRequest.countDocuments({ urgency: 'high' });

    res.json({
      requests,
      totalRequests,
      pendingRequests,
      urgentRequests
    });
  } catch (err) {
    console.error('Error in getAllRequests:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/admin/requests/search
// @desc    Search requests by various criteria
// @access  Private (Admin only)
exports.searchRequests = async (req, res) => {
  try {
    const { query, status, bloodType } = req.query;
    
    const searchQuery = {};
    
    // Add search criteria if provided
    if (query) {
      searchQuery.$or = [
        { patientName: { $regex: query, $options: 'i' } },
        { 'hospital.name': { $regex: query, $options: 'i' } }
      ];
    }
    
    if (status) {
      searchQuery.status = status;
    }
    
    if (bloodType) {
      searchQuery.bloodType = bloodType;
    }

    const requests = await BloodRequest.find(searchQuery)
      .populate('requestedBy', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    console.error('Error in searchRequests:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/admin/requests/:id
// @desc    Get request details by ID
// @access  Private (Admin only)
exports.getRequestById = async (req, res) => {
  try {
    const requestId = req.params.id;

    const request = await BloodRequest.findById(requestId)
      .populate('requestedBy', 'name email phone')
      .populate('donors.donor', 'name email phone bloodGroup')
      .lean();

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(request);
  } catch (err) {
    console.error('Error in getRequestById:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/admin/requests
// @desc    Create a new blood request
// @access  Private (Admin only)
exports.createRequest = async (req, res) => {
  try {
    const {
      patientName,
      bloodType,
      unitsNeeded,
      hospital,
      location,
      urgency,
      reason,
      requiredBy,
      contactInfo,
      requestedBy
    } = req.body;

    console.log('Creating request with data:', req.body);

    // Find a user to associate with the request (default to admin if not specified)
    let userId = requestedBy;
    if (!userId) {
      // If no specific user ID is provided, find a user with requestor role
      const user = await User.findOne({ roles: 'requestor' }).select('_id').lean();
      if (user) {
        userId = user._id;
      } else {
        // If no requestor is found, use the admin user
        const adminUser = await User.findOne({ role: 'admin' }).select('_id').lean();
        userId = adminUser._id;
      }
    }

    // Create new blood request
    const newRequest = new BloodRequest({
      requestedBy: userId,
      patientName,
      bloodType,
      unitsNeeded,
      hospital: {
        name: hospital?.name || hospital || 'General Hospital',
        address: hospital?.address || '',
        city: hospital?.city || '',
        state: hospital?.state || '',
        zipCode: hospital?.zipCode || '',
        phone: hospital?.phone || ''
      },
      location: location || {
        type: 'Point',
        coordinates: [77.2090, 28.6139] // Default coordinates (Delhi)
      },
      urgency: urgency || 'normal',
      reason,
      requiredBy: new Date(requiredBy),
      contactInfo: contactInfo || {
        name: patientName,
        phone: '',
        email: '',
        relationship: 'self'
      },
      status: 'pending'
    });

    await newRequest.save();

    res.status(201).json({
      message: 'Blood request created successfully',
      request: newRequest
    });
  } catch (err) {
    console.error('Error in createRequest:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   PUT /api/admin/requests/:id
// @desc    Update request status
// @access  Private (Admin only)
exports.updateRequestStatus = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { status, adminNotes } = req.body;

    const request = await BloodRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Update request fields
    if (status) request.status = status;
    if (adminNotes) request.adminNotes = adminNotes;
    
    // Add timestamp for status change
    request.statusUpdatedAt = Date.now();
    request.statusUpdatedBy = 'admin';

    await request.save();

    res.json({ message: 'Request updated successfully', request });
  } catch (err) {
    console.error('Error in updateRequestStatus:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   PUT /api/admin/requests/:id
// @desc    Update request
// @access  Private (Admin only)
exports.updateRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const {
      patientName,
      bloodType,
      unitsNeeded,
      hospital,
      location,
      urgency,
      reason,
      requiredBy,
      contactInfo,
      status,
      adminNotes
    } = req.body;

    const request = await BloodRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Update request fields if provided
    if (patientName) request.patientName = patientName;
    if (bloodType) request.bloodType = bloodType;
    if (unitsNeeded) request.unitsNeeded = unitsNeeded;
    if (hospital) {
      request.hospital = {
        name: hospital.name || hospital,
        address: hospital.address || request.hospital.address,
        city: hospital.city || request.hospital.city,
        state: hospital.state || request.hospital.state,
        zipCode: hospital.zipCode || request.hospital.zipCode,
        phone: hospital.phone || request.hospital.phone
      };
    }
    if (location) request.location = location;
    if (urgency) request.urgency = urgency;
    if (reason) request.reason = reason;
    if (requiredBy) request.requiredBy = new Date(requiredBy);
    if (contactInfo) request.contactInfo = contactInfo;
    if (status) {
      request.status = status;
      request.statusUpdatedAt = Date.now();
      request.statusUpdatedBy = 'admin';
    }
    if (adminNotes) request.adminNotes = adminNotes;

    await request.save();

    res.json({
      message: 'Request updated successfully',
      request
    });
  } catch (err) {
    console.error('Error in updateRequest:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   DELETE /api/admin/requests/:id
// @desc    Delete request
// @access  Private (Admin only)
exports.deleteRequest = async (req, res) => {
  try {
    const requestId = req.params.id;

    const request = await BloodRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    await BloodRequest.findByIdAndDelete(requestId);

    res.json({ message: 'Request deleted successfully' });
  } catch (err) {
    console.error('Error in deleteRequest:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/admin/requests/stats
// @desc    Get request statistics
// @access  Private (Admin only)
exports.getRequestStats = async (req, res) => {
  try {
    // Get total count
    const totalRequests = await BloodRequest.countDocuments();
    
    // Get counts by status
    const pendingRequests = await BloodRequest.countDocuments({ status: 'pending' });
    const fulfilledRequests = await BloodRequest.countDocuments({ status: 'fulfilled' });
    const partiallyFulfilledRequests = await BloodRequest.countDocuments({ status: 'partially_fulfilled' });
    const cancelledRequests = await BloodRequest.countDocuments({ status: 'cancelled' });
    
    // Get counts by urgency
    const urgentRequests = await BloodRequest.countDocuments({ urgency: 'urgent' });
    const emergencyRequests = await BloodRequest.countDocuments({ urgency: 'emergency' });
    
    // Get blood type distribution
    const bloodTypeDistribution = await BloodRequest.aggregate([
      { $group: { _id: '$bloodType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Format blood type distribution
    const bloodTypeData = {};
    bloodTypeDistribution.forEach(item => {
      bloodTypeData[item._id] = item.count;
    });
    
    // Get hospital distribution
    const hospitalDistribution = await BloodRequest.aggregate([
      { $group: { _id: '$hospital.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Format hospital distribution
    const hospitalData = {};
    hospitalDistribution.forEach(item => {
      if (item._id) {
        hospitalData[item._id] = item.count;
      }
    });

    res.json({
      totalRequests,
      pendingRequests,
      fulfilledRequests,
      partiallyFulfilledRequests,
      cancelledRequests,
      urgentRequests,
      emergencyRequests,
      bloodTypeDistribution: bloodTypeData,
      hospitalDistribution: hospitalData
    });
  } catch (err) {
    console.error('Error in getRequestStats:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
