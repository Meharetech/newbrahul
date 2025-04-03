const jwt = require('jsonwebtoken');

/**
 * Special middleware for admin authentication that doesn't try to look up the user in the database
 * This middleware verifies that the token is valid and that the user has the admin role
 */
module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Set the user from the decoded token
    req.user = decoded.user;
    
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    // For admin routes, we don't need to look up the user in the database
    // since we're using a hardcoded admin account
    next();
  } catch (err) {
    console.error('Admin auth error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
