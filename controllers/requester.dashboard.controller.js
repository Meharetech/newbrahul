const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const Donor = require('../models/Donor');

/**
 * Get dashboard data for requester
 * @route GET /api/dashboard/requester
 * @access Private
 */
exports.getRequesterDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all requests created by this user
    const requests = await BloodRequest.find({ requestedBy: userId })
      .populate('requestedBy', 'name email phone')
      .populate({
        path: 'donors.donor',
        select: 'name email phone bloodGroup isAvailable',
        populate: {
          path: 'user',
          select: 'name email phone bloodGroup'
        }
      })
      .sort({ createdAt: -1 });

    // Calculate stats
    const totalRequests = requests.length;
    const activeRequests = requests.filter(req => 
      req.status === 'pending' || req.status === 'in_progress'
    ).length;
    const completedRequests = requests.filter(req => 
      req.status === 'fulfilled' || req.status === 'partially_fulfilled'
    ).length;

    // Count unique donors who have responded to this user's requests
    const uniqueDonorIds = new Set();
    requests.forEach(request => {
      if (request.donors && request.donors.length > 0) {
        request.donors.forEach(donor => {
          if (donor.donor) {
            const donorId = donor.donor._id || donor.donor;
            uniqueDonorIds.add(donorId.toString());
          }
        });
      }
    });
    const totalDonors = uniqueDonorIds.size;

    // Get recent requests (last 5)
    const recentRequests = requests.slice(0, 5).map(request => ({
      _id: request._id,
      patientName: request.patientName,
      bloodType: request.bloodType,
      unitsNeeded: request.unitsNeeded,
      hospital: request.hospital,
      status: request.status,
      createdAt: request.createdAt,
      urgency: request.urgency,
      donors: request.donors.length
    }));

    // Get blood type distribution for this user's requests
    const bloodTypeDistribution = {};
    requests.forEach(request => {
      const bloodType = request.bloodType;
      if (!bloodTypeDistribution[bloodType]) {
        bloodTypeDistribution[bloodType] = 0;
      }
      bloodTypeDistribution[bloodType] += request.unitsNeeded;
    });

    // Format blood type distribution for frontend
    const bloodTypeRequirements = Object.keys(bloodTypeDistribution).map(type => ({
      type,
      units: bloodTypeDistribution[type]
    }));

    // Get request status distribution
    const statusDistribution = {
      pending: 0,
      in_progress: 0,
      fulfilled: 0,
      partially_fulfilled: 0,
      cancelled: 0
    };

    requests.forEach(request => {
      if (statusDistribution[request.status] !== undefined) {
        statusDistribution[request.status]++;
      }
    });

    // Calculate percentages for status distribution
    const totalStatusCount = Object.values(statusDistribution).reduce((sum, count) => sum + count, 0);
    const statusPercentages = {};
    
    if (totalStatusCount > 0) {
      Object.keys(statusDistribution).forEach(status => {
        statusPercentages[status] = Math.round((statusDistribution[status] / totalStatusCount) * 100);
      });
    }

    // Return dashboard data
    res.json({
      stats: {
        totalRequests,
        activeRequests,
        completedRequests,
        totalDonors
      },
      recentRequests,
      bloodTypeRequirements,
      statusDistribution: statusPercentages
    });
  } catch (err) {
    console.error('Error in getRequesterDashboard:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get active requests for requester
 * @route GET /api/dashboard/requester/active
 * @access Private
 */
exports.getActiveRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all active requests created by this user
    const activeRequests = await BloodRequest.find({ 
      requestedBy: userId,
      status: { $in: ['pending', 'in_progress'] }
    })
      .populate('requestedBy', 'name email phone')
      .populate({
        path: 'donors.donor',
        select: 'name email phone bloodGroup isAvailable',
        populate: {
          path: 'user',
          select: 'name email phone bloodGroup'
        }
      })
      .sort({ createdAt: -1 });

    res.json(activeRequests);
  } catch (err) {
    console.error('Error in getActiveRequests:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get request history for requester
 * @route GET /api/dashboard/requester/history
 * @access Private
 */
exports.getRequestHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all completed or cancelled requests created by this user
    const requestHistory = await BloodRequest.find({ 
      requestedBy: userId,
      status: { $in: ['fulfilled', 'partially_fulfilled', 'cancelled'] }
    })
      .populate('requestedBy', 'name email phone')
      .populate({
        path: 'donors.donor',
        select: 'name email phone bloodGroup isAvailable',
        populate: {
          path: 'user',
          select: 'name email phone bloodGroup'
        }
      })
      .sort({ createdAt: -1 });

    res.json(requestHistory);
  } catch (err) {
    console.error('Error in getRequestHistory:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
