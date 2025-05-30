const jwt = require('jsonwebtoken');

// Use environment variable or fallback to a default secret
const JWT_SECRET = process.env.JWT_SECRET || 'bloodhero-secret-key';

module.exports = function(req, res, next) {
  console.log('NGO Auth middleware running');
  
  // Get token from header
  const authHeader = req.header('Authorization');
  console.log('Auth header:', authHeader);
  
  if (!authHeader) {
    console.log('No authorization header found');
    return res.status(401).json({ 
      success: false,
      message: 'No token, authorization denied' 
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  console.log('Token extracted:', token ? 'Token found' : 'No token');

  // Check if no token
  if (!token) {
    console.log('No token found after extraction');
    return res.status(401).json({ 
      success: false,
      message: 'No token, authorization denied' 
    });
  }

  // Verify token
  try {
    console.log('Verifying token with secret:', process.env.JWT_SECRET ? 'Secret exists' : 'No secret found');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified, decoded:', decoded);
    
    // Check if the token is for an NGO
    if (!decoded.ngo) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized as an NGO' 
      });
    }
    
    // Ensure ngo object has id property
    req.ngo = {
      ...decoded.ngo,
      id: decoded.ngo._id || decoded.ngo.id // Ensure id is available
    };
    
    console.log('NGO auth successful, ngo ID:', req.ngo.id);
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid',
      error: err.message 
    });
  }
};
