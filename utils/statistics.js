const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const EmergencyRequest = require('../models/EmergencyRequest');
const User = require('../models/User');

// Get overall platform statistics
exports.getOverallStatistics = async () => {
  try {
    const totalDonors = await Donor.countDocuments();
    const totalRequests = await BloodRequest.countDocuments();
    const totalEmergencyRequests = await EmergencyRequest.countDocuments();
    const totalUsers = await User.countDocuments();
    
    const fulfilledRequests = await BloodRequest.countDocuments({ status: 'fulfilled' });
    const fulfilledEmergencyRequests = await EmergencyRequest.countDocuments({ status: 'fulfilled' });
    
    // Calculate fulfillment rate
    const requestFulfillmentRate = totalRequests > 0 
      ? (fulfilledRequests / totalRequests) * 100 
      : 0;
      
    const emergencyFulfillmentRate = totalEmergencyRequests > 0 
      ? (fulfilledEmergencyRequests / totalEmergencyRequests) * 100 
      : 0;
    
    // Get blood type distribution
    const bloodTypeDistribution = await Donor.aggregate([
      { $group: { _id: '$bloodType', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Format blood type distribution
    const bloodTypes = {};
    bloodTypeDistribution.forEach(item => {
      bloodTypes[item._id] = item.count;
    });
    
    return {
      totalDonors,
      totalRequests,
      totalEmergencyRequests,
      totalUsers,
      fulfilledRequests,
      fulfilledEmergencyRequests,
      requestFulfillmentRate: requestFulfillmentRate.toFixed(2),
      emergencyFulfillmentRate: emergencyFulfillmentRate.toFixed(2),
      bloodTypeDistribution: bloodTypes
    };
  } catch (error) {
    console.error('Error getting statistics:', error);
    throw error;
  }
};

// Get donor statistics
exports.getDonorStatistics = async (donorId) => {
  try {
    const donor = await Donor.findById(donorId);
    if (!donor) {
      throw new Error('Donor not found');
    }
    
    // Count donations
    const totalDonations = donor.donationHistory.length;
    
    // Calculate total donated amount
    const totalDonatedAmount = donor.donationHistory.reduce(
      (sum, donation) => sum + (donation.amount || 0), 
      0
    );
    
    // Get last donation date
    const lastDonation = donor.donationHistory.length > 0 
      ? donor.donationHistory.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
      : null;
    
    // Count requests responded to
    const requestsRespondedTo = await BloodRequest.countDocuments({
      'donors.donor': donorId
    });
    
    // Count emergency requests responded to
    const emergencyRequestsRespondedTo = await EmergencyRequest.countDocuments({
      'responders.donor': donorId
    });
    
    return {
      totalDonations,
      totalDonatedAmount,
      lastDonation,
      requestsRespondedTo,
      emergencyRequestsRespondedTo
    };
  } catch (error) {
    console.error('Error getting donor statistics:', error);
    throw error;
  }
};

// Get monthly donation statistics
exports.getMonthlyDonationStatistics = async (year = new Date().getFullYear()) => {
  try {
    // Get all donors
    const donors = await Donor.find();
    
    // Initialize monthly data
    const monthlyData = Array(12).fill(0);
    
    // Count donations by month
    donors.forEach(donor => {
      donor.donationHistory.forEach(donation => {
        const donationDate = new Date(donation.date);
        if (donationDate.getFullYear() === year) {
          const month = donationDate.getMonth();
          monthlyData[month] += 1;
        }
      });
    });
    
    return {
      year,
      monthlyDonations: monthlyData
    };
  } catch (error) {
    console.error('Error getting monthly statistics:', error);
    throw error;
  }
};

// Get request statistics by location
exports.getRequestStatisticsByLocation = async () => {
  try {
    // Group requests by city
    const requestsByCity = await BloodRequest.aggregate([
      { $group: { 
        _id: '$hospital.city', 
        count: { $sum: 1 },
        fulfilled: { 
          $sum: { 
            $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] 
          } 
        }
      }},
      { $sort: { count: -1 } }
    ]);
    
    // Group emergency requests by city
    const emergencyRequestsByCity = await EmergencyRequest.aggregate([
      { $group: { 
        _id: '$hospital.city', 
        count: { $sum: 1 },
        fulfilled: { 
          $sum: { 
            $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] 
          } 
        }
      }},
      { $sort: { count: -1 } }
    ]);
    
    return {
      requestsByCity,
      emergencyRequestsByCity
    };
  } catch (error) {
    console.error('Error getting location statistics:', error);
    throw error;
  }
};
