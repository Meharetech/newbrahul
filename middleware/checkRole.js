// Middleware to check user role
const checkRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  next();
};

module.exports = checkRole;
