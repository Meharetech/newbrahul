const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

/**
 * @route   POST /api/admin/login
 * @desc    Admin login
 * @access  Public
 */
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check if the provided credentials match the admin credentials from .env
    const adminEmail = process.env.ADMIN_EMAIL || 'rahul@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'rahul2002@#';

    // Verify email
    if (email !== adminEmail) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Verify password
    const isMatch = password === adminPassword;
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: 'admin',
        role: 'admin',
        email: adminEmail
      }
    };

    // Sign the token using JWT_SECRET from environment variables
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: 'admin',
            email: adminEmail,
            role: 'admin',
            roles: ['admin']
          }
        });
      }
    );
  } catch (err) {
    console.error('Admin login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @route   GET /api/admin/profile
 * @desc    Get admin profile
 * @access  Private (Admin only)
 */
exports.getProfile = async (req, res) => {
  try {
    // Since we're using a fixed admin account, we can just return the basic info
    res.json({
      id: 'admin',
      email: process.env.ADMIN_EMAIL || 'rahul@gmail.com',
      role: 'admin',
      roles: ['admin'],
      name: 'Admin User'
    });
  } catch (err) {
    console.error('Error fetching admin profile:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin only)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Import models - using only models that actually exist
    const User = require('../models/User');
    const Donor = require('../models/Donor');
    const BloodRequest = require('../models/BloodRequest');
    const Donation = require('../models/Donation');  // Fixed: was incorrectly using DonationHistory

    // Initialize stats object with default values
    const stats = {
      totalDonors: 0,
      activeDonors: 0,
      pendingRequests: 0,
      completedDonations: 0,
      emergencyRequests: 0,
      totalBloodUnits: 0,
      bloodInventory: {
        'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 
        'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
      },
      recentActivity: []
    };

    // Get total donors count
    try {
      stats.totalDonors = await Donor.countDocuments();
    } catch (err) {
      console.error('Error counting donors:', err);
    }
    
    // Get pending requests
    try {
      stats.pendingRequests = await BloodRequest.countDocuments({ status: 'pending' });
    } catch (err) {
      console.error('Error counting pending requests:', err);
    }
    
    // Get completed donations
    try {
      stats.completedDonations = await Donation.countDocuments();
    } catch (err) {
      console.error('Error counting completed donations:', err);
    }
    
    // Get emergency requests
    try {
      stats.emergencyRequests = await BloodRequest.countDocuments({ 
        isEmergency: true, 
        status: { $nin: ['fulfilled', 'cancelled'] } 
      });
    } catch (err) {
      console.error('Error counting emergency requests:', err);
    }

    // Get active donors (donated in the last 3 months)
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const activeDonorIds = await Donation.distinct('donorId', {
        donationDate: { $gte: threeMonthsAgo }
      });
      stats.activeDonors = activeDonorIds.length;
    } catch (err) {
      console.error('Error counting active donors:', err);
    }

    // Get blood inventory
    try {
      const bloodInventory = await Donation.aggregate([
        { $match: { status: 'available' } },
        { $group: { _id: '$bloodType', count: { $sum: 1 } } }
      ]);
      
      // Format blood inventory
      bloodInventory.forEach(item => {
        if (item._id && stats.bloodInventory.hasOwnProperty(item._id)) {
          stats.bloodInventory[item._id] = item.count;
        }
      });
      
      // Calculate total blood units
      stats.totalBloodUnits = Object.values(stats.bloodInventory).reduce((sum, count) => sum + count, 0);
    } catch (err) {
      console.error('Error getting blood inventory:', err);
    }

    // Get recent activity (simplified)
    try {
      // Recent donations
      const recentDonations = await Donation.find()
        .sort({ donationDate: -1 })
        .limit(2)
        .populate('donorId', 'name')
        .lean();
      
      // Recent requests
      const recentRequests = await BloodRequest.find()
        .sort({ createdAt: -1 })
        .limit(2)
        .populate('requestedBy', 'name')
        .lean();
      
      // Format recent activity
      const activities = [
        ...recentDonations.map(donation => ({
          type: 'Donation',
          description: `${donation.donorId?.name || 'Anonymous'} donated blood type ${donation.bloodType || 'Unknown'}`,
          date: new Date(donation.donationDate || Date.now()).toLocaleString(),
          status: 'Completed',
          statusClass: 'bg-green-100 text-green-800'
        })),
        ...recentRequests.map(request => ({
          type: 'Request',
          description: `${request.requestedBy?.name || 'Anonymous'} requested ${request.unitsRequired || 1} units of ${request.bloodType || 'Unknown'}`,
          date: new Date(request.createdAt || Date.now()).toLocaleString(),
          status: request.status === 'pending' ? 'Pending' : request.status || 'Unknown',
          statusClass: request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
        }))
      ];
      
      stats.recentActivity = activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    } catch (err) {
      console.error('Error getting recent activity:', err);
    }

    // Return all stats
    return res.json(stats);
    
  } catch (err) {
    console.error('Error fetching admin dashboard stats:', err);
    return res.status(500).json({ 
      message: 'Server error', 
      error: err.message || 'Unknown error' 
    });
  }
};
