const User = require('../models/User');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const EmergencyRequest = require('../models/EmergencyRequest');
const Event = require('../models/Event');
const { getOverallStatistics } = require('../utils/statistics');

// @desc    Get dashboard data for admin
// @route   GET /api/dashboard/admin
// @access  Private (Admin)
exports.getAdminDashboard = async (req, res) => {
  try {
    // Get overall statistics
    const stats = await getOverallStatistics();
    
    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt');
    
    // Get recent blood requests
    const recentRequests = await BloodRequest.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('requestedBy', 'name')
      .select('bloodType units status hospital createdAt');
    
    // Get recent emergency requests
    const recentEmergencyRequests = await EmergencyRequest.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('requestedBy', 'name')
      .select('bloodType units status hospital createdAt');
    
    // Get upcoming events
    const upcomingEvents = await Event.find({
      date: { $gte: new Date() }
    })
      .sort({ date: 1 })
      .limit(5)
      .populate('organizer', 'name')
      .select('title date location.coordinates address status');
    
    res.json({
      stats,
      recentUsers,
      recentRequests,
      recentEmergencyRequests,
      upcomingEvents
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get dashboard data for donor
// @route   GET /api/dashboard/donor
// @access  Private
exports.getDonorDashboard = async (req, res) => {
  try {
    // Get donor profile and user data
    const donor = await Donor.findOne({ user: req.user.id }).populate('user', 'name email phone bloodGroup');
    
    if (!donor) {
      return res.status(404).json({ message: 'Donor profile not found' });
    }
    
    // Get donation history
    const donationHistory = donor.donationHistory.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    // Get accepted blood requests
    const acceptedRequests = await BloodRequest.find({
      'donors.donor': donor._id,
      'donors.status': { $in: ['accepted', 'donated', 'verified'] }
    })
      .populate('requestedBy', 'name')
      .sort({ createdAt: -1 })
      .select('patientName bloodType hospital status createdAt donors');
    
    // Get donation streak
    const sortedDonations = [...donationHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    let donationStreak = 0;
    let currentDate = new Date();
    
    // Calculate streak based on regular donations (every 3 months)
    if (sortedDonations.length > 0) {
      const lastDonationDate = new Date(sortedDonations[sortedDonations.length - 1].date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      if (lastDonationDate >= threeMonthsAgo) {
        donationStreak = 1;
        let prevDate = lastDonationDate;
        
        for (let i = sortedDonations.length - 2; i >= 0; i--) {
          const currDate = new Date(sortedDonations[i].date);
          const monthDiff = (prevDate.getFullYear() - currDate.getFullYear()) * 12 + 
                            (prevDate.getMonth() - currDate.getMonth());
          
          if (monthDiff >= 2 && monthDiff <= 4) { // Allow 2-4 months between donations for streak
            donationStreak++;
            prevDate = currDate;
          } else {
            break;
          }
        }
      }
    }
    
    // Get nearby blood requests that match donor's blood type
    const nearbyRequests = await BloodRequest.find({
      status: { $in: ['pending', 'in_progress'] },
      bloodType: donor.user.bloodGroup || donor.bloodType,
    })
      .limit(5)
      .select('patientName bloodType unitsNeeded hospital status createdAt urgency')
      .sort({ urgency: -1, createdAt: -1 });
    
    // Get upcoming appointments
    const upcomingAppointments = [];
    
    // If donor has any accepted requests with future appointments
    const futureAppointments = acceptedRequests
      .filter(req => {
        const donorEntry = req.donors.find(d => d.donor.toString() === donor._id.toString());
        return donorEntry && donorEntry.appointmentDate && new Date(donorEntry.appointmentDate) > new Date();
      })
      .map(req => {
        const donorEntry = req.donors.find(d => d.donor.toString() === donor._id.toString());
        return {
          requestId: req._id,
          hospital: typeof req.hospital === 'object' ? req.hospital.name : req.hospital,
          date: donorEntry.appointmentDate,
          time: donorEntry.appointmentTime || '10:00 AM',
          status: donorEntry.status
        };
      });
    
    upcomingAppointments.push(...futureAppointments);
    
    // Get upcoming events
    const upcomingEvents = await Event.find({
      date: { $gte: new Date() }
    })
      .sort({ date: 1 })
      .limit(3)
      .select('title date location description');
    
    // Calculate impact metrics
    const impactMetrics = {
      totalDonations: donationHistory.length,
      livesSaved: donationHistory.length * 3, // Assuming each donation saves 3 lives
      hospitalsServed: [...new Set(donationHistory.map(d => d.hospital))].length,
      successRate: donationHistory.length > 0 ? 
        Math.round((donationHistory.filter(d => d.status === 'successful').length / donationHistory.length) * 100) : 0
    };
    
    // Calculate monthly donations for chart
    const monthlyDonations = Array(12).fill(0);
    const currentYear = new Date().getFullYear();
    
    donationHistory.forEach(donation => {
      const donationDate = new Date(donation.date);
      if (donationDate.getFullYear() === currentYear) {
        monthlyDonations[donationDate.getMonth()]++;
      }
    });
    
    // Get achievements
    const achievements = [];
    
    // Add achievements based on donation count
    if (donationHistory.length >= 1) {
      achievements.push({
        title: 'First Time Donor',
        date: donationHistory[donationHistory.length - 1].date,
        description: 'Completed your first blood donation'
      });
    }
    
    if (donationHistory.length >= 5) {
      achievements.push({
        title: 'Regular Donor',
        date: donationHistory[donationHistory.length - 5].date,
        description: 'Completed 5 blood donations'
      });
    }
    
    if (donationHistory.length >= 10) {
      achievements.push({
        title: 'Silver Donor',
        date: donationHistory[donationHistory.length - 10].date,
        description: 'Completed 10 blood donations'
      });
    }
    
    if (donationHistory.length >= 20) {
      achievements.push({
        title: 'Gold Donor',
        date: donationHistory[donationHistory.length - 20].date,
        description: 'Completed 20 blood donations'
      });
    }
    
    if (donationHistory.length >= 50) {
      achievements.push({
        title: 'Platinum Donor',
        date: donationHistory[donationHistory.length - 50].date,
        description: 'Completed 50 blood donations'
      });
    }
    
    // Add achievement for donation streak
    if (donationStreak >= 3) {
      achievements.push({
        title: 'Consistent Donor',
        date: new Date().toISOString(),
        description: `Maintained a donation streak of ${donationStreak}`
      });
    }
    
    // Calculate year-over-year growth
    let yoyGrowth = 0;
    const thisYear = donationHistory.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === currentYear;
    }).length;
    
    const lastYear = donationHistory.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === currentYear - 1;
    }).length;
    
    if (lastYear > 0) {
      yoyGrowth = Math.round(((thisYear - lastYear) / lastYear) * 100);
    }
    
    res.json({
      donor: {
        name: donor.user?.name || donor.name,
        bloodType: donor.user?.bloodGroup || donor.bloodType,
        lastDonation: donationHistory.length > 0 ? donationHistory[0].date : null,
        totalDonations: donationHistory.length,
        donationStreak: donationStreak,
        nextEligibleDate: donationHistory.length > 0 ? 
          new Date(new Date(donationHistory[0].date).setMonth(new Date(donationHistory[0].date).getMonth() + 3)).toISOString() : 
          new Date().toISOString()
      },
      donationHistory: donationHistory.slice(0, 10), // Return only the 10 most recent donations
      acceptedRequests: acceptedRequests.slice(0, 5), // Return only the 5 most recent accepted requests
      nearbyRequests,
      upcomingAppointments,
      upcomingEvents,
      impactMetrics,
      monthlyDonations,
      achievements: achievements.slice(0, 5), // Return only the 5 most significant achievements
      yoyGrowth
    });
  } catch (err) {
    console.error('Error in getDonorDashboard:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get dashboard data for hospital
// @route   GET /api/dashboard/hospital
// @access  Private (Hospital)
exports.getHospitalDashboard = async (req, res) => {
  try {
    // Get hospital's active requests
    const activeRequests = await BloodRequest.find({
      requestedBy: req.user.id,
      status: { $in: ['open', 'in-progress'] }
    })
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Get hospital's active emergency requests
    const activeEmergencyRequests = await EmergencyRequest.find({
      requestedBy: req.user.id,
      status: { $in: ['open', 'in-progress'] }
    })
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Get hospital's request history
    const requestHistory = await BloodRequest.find({
      requestedBy: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Get nearby donors count by blood type
    const hospital = await User.findById(req.user.id).select('location');
    
    let nearbyDonorsByBloodType = [];
    
    if (hospital && hospital.location) {
      nearbyDonorsByBloodType = await Donor.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: hospital.location.coordinates
            },
            distanceField: 'distance',
            maxDistance: 20000, // 20km
            query: { isAvailable: true }
          }
        },
        {
          $group: {
            _id: '$bloodType',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
    }
    
    res.json({
      activeRequests,
      activeEmergencyRequests,
      requestHistory,
      nearbyDonorsByBloodType
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get dashboard data for requester
// @route   GET /api/dashboard/requester
// @access  Private
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

// @desc    Get user statistics
// @route   GET /api/dashboard/user-stats
// @access  Private
exports.getUserStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get basic user information
    const userInfo = {
      name: user.name,
      email: user.email,
      role: user.role,
      bloodGroup: user.bloodGroup,
      joinedDate: user.createdAt,
      daysActive: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))
    };
    
    // Get donor-specific statistics if user is a donor
    let donorStats = null;
    if (user.role === 'donor') {
      const donor = await Donor.findOne({ user: userId });
      if (donor) {
        // Get donation history
        const donationHistory = donor.donationHistory || [];
        
        // Calculate total donations
        const totalDonations = donationHistory.length;
        
        // Calculate total units donated
        const totalUnitsDonated = donationHistory.reduce((sum, donation) => sum + (donation.units || 1), 0);
        
        // Get last donation date
        const lastDonation = donationHistory.length > 0 
          ? donationHistory.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
          : null;
        
        // Calculate when user can donate next (3 months after last donation)
        const nextDonationDate = lastDonation 
          ? new Date(new Date(lastDonation).setMonth(new Date(lastDonation).getMonth() + 3))
          : new Date();
        
        // Calculate donation streak
        const sortedDonations = [...donationHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
        let donationStreak = 0;
        
        // Calculate streak based on regular donations (every 3 months)
        if (sortedDonations.length > 0) {
          const lastDonationDate = new Date(sortedDonations[sortedDonations.length - 1].date);
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          
          if (lastDonationDate >= threeMonthsAgo) {
            donationStreak = 1;
            let prevDate = lastDonationDate;
            
            for (let i = sortedDonations.length - 2; i >= 0; i--) {
              const currDate = new Date(sortedDonations[i].date);
              const monthDiff = (prevDate.getFullYear() - currDate.getFullYear()) * 12 + 
                prevDate.getMonth() - currDate.getMonth();
              
              if (monthDiff <= 4 && monthDiff >= 2) {
                donationStreak++;
                prevDate = currDate;
              } else {
                break;
              }
            }
          }
        }
        
        // Get accepted blood requests
        const acceptedRequests = await BloodRequest.countDocuments({
          'donors.donor': donor._id,
          'donors.status': { $in: ['accepted', 'donated', 'verified'] }
        });
        
        // Get fulfilled blood requests
        const fulfilledRequests = await BloodRequest.countDocuments({
          'donors.donor': donor._id,
          'donors.status': { $in: ['donated', 'verified'] }
        });
        
        // Get recent activity
        const recentActivity = await BloodRequest.find({
          'donors.donor': donor._id
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('requestedBy', 'name')
          .select('patientName bloodType hospital status createdAt donors');
        
        donorStats = {
          totalDonations,
          totalUnitsDonated,
          lastDonation,
          nextDonationDate,
          donationStreak,
          acceptedRequests,
          fulfilledRequests,
          recentActivity,
          donationHistory: donationHistory.slice(0, 5) // Get only the 5 most recent donations
        };
      }
    }
    
    // Get requester-specific statistics if user is a requester
    let requesterStats = null;
    if (user.role === 'requester' || user.role === 'both') {
      // Get total requests created
      const totalRequests = await BloodRequest.countDocuments({ requestedBy: userId });
      
      // Get fulfilled requests
      const fulfilledRequests = await BloodRequest.countDocuments({ 
        requestedBy: userId,
        status: 'fulfilled'
      });
      
      // Get pending requests
      const pendingRequests = await BloodRequest.countDocuments({ 
        requestedBy: userId,
        status: { $in: ['pending', 'active'] }
      });
      
      // Calculate fulfillment rate
      const fulfillmentRate = totalRequests > 0 ? (fulfilledRequests / totalRequests) * 100 : 0;
      
      // Get recent requests
      const recentRequests = await BloodRequest.find({ requestedBy: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('patientName bloodType hospital status createdAt donors');
      
      requesterStats = {
        totalRequests,
        fulfilledRequests,
        pendingRequests,
        fulfillmentRate: fulfillmentRate.toFixed(2),
        recentRequests
      };
    }
    
    // Get overall platform statistics for comparison
    const overallStats = await getOverallStatistics();
    
    // Compile all statistics
    const userStatistics = {
      userInfo,
      donorStats,
      requesterStats,
      overallStats
    };
    
    res.json(userStatistics);
  } catch (err) {
    console.error('Error fetching user statistics:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
