const jwt = require('jsonwebtoken');
const VehicleUser = require('../models/VehicleUser');

module.exports = async (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user is a vehicle owner
    if (decoded.role !== 'vehicle-owner') {
      return res.status(403).json({ message: 'Not authorized as a vehicle owner' });
    }

    // Find the vehicle user
    const vehicleUser = await VehicleUser.findById(decoded.id);
    if (!vehicleUser) {
      return res.status(404).json({ message: 'Vehicle owner not found' });
    }

    // Add user to request object
    req.user = {
      id: decoded.id,
      role: decoded.role
    };
    
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
