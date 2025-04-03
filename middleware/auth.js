const jwt = require('jsonwebtoken');

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
    req.user = decoded.user;
    
    // Special handling for admin user
    // This prevents routes from trying to find the admin in the database
    // which would cause the "Cast to ObjectId failed for value 'admin'" error
    if (req.user.id === 'admin' && req.user.role === 'admin') {
      req.isAdmin = true; // Flag to indicate this is the admin user
    }
    
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
