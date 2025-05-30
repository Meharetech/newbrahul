// Middleware for routes that should be accessible without authentication
module.exports = function(req, res, next) {
  // This middleware simply passes the request through without checking for authentication
  // It's used for routes that should be accessible to anyone
  next();
};
