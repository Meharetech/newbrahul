const socketIO = require('socket.io');
let io;

// Initialize Socket.IO with the HTTP server
exports.init = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join user to their personal room
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`User ${userId} joined their personal room`);
      }
    });

    // Join donor to their blood type room
    socket.on('joinBloodTypeRoom', (bloodType) => {
      if (bloodType) {
        socket.join(`bloodType:${bloodType}`);
        console.log(`User joined blood type room: ${bloodType}`);
      }
    });

    // Join location-based room (for nearby notifications)
    socket.on('joinLocationRoom', (locationId) => {
      if (locationId) {
        socket.join(`location:${locationId}`);
        console.log(`User joined location room: ${locationId}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

// Get the Socket.IO instance
exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Send notification to a specific user
exports.notifyUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

// Send notification to users with a specific blood type
exports.notifyBloodType = (bloodType, event, data) => {
  if (!io) return;
  io.to(`bloodType:${bloodType}`).emit(event, data);
};

// Send notification to users in a specific location
exports.notifyLocation = (locationId, event, data) => {
  if (!io) return;
  io.to(`location:${locationId}`).emit(event, data);
};

// Send notification to all connected users
exports.notifyAll = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

// Notification types
exports.NOTIFICATION_TYPES = {
  NEW_BLOOD_REQUEST: 'new_blood_request',
  EMERGENCY_REQUEST: 'emergency_request',
  REQUEST_FULFILLED: 'request_fulfilled',
  NEW_DONATION_EVENT: 'new_donation_event',
  DONATION_REMINDER: 'donation_reminder',
  PROFILE_UPDATE: 'profile_update',
  VOLUNTEER_OPPORTUNITY: 'volunteer_opportunity',
  ADMIN_ANNOUNCEMENT: 'admin_announcement'
};
