const { 
  getOverallStatistics, 
  getDonorStatistics, 
  getMonthlyDonationStatistics,
  getRequestStatisticsByLocation
} = require('../utils/statistics');

// Get overall platform statistics
exports.getOverallStats = async (req, res) => {
  try {
    const stats = await getOverallStatistics();
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get donor statistics
exports.getDonorStats = async (req, res) => {
  try {
    const donorId = req.params.donorId;
    const stats = await getDonorStatistics(donorId);
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    if (err.message === 'Donor not found') {
      return res.status(404).json({ message: 'Donor not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get monthly donation statistics
exports.getMonthlyStats = async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const stats = await getMonthlyDonationStatistics(year);
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get request statistics by location
exports.getLocationStats = async (req, res) => {
  try {
    const stats = await getRequestStatisticsByLocation();
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
