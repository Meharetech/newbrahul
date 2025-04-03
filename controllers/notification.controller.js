const User = require('../models/User');
const socketUtils = require('../utils/socket');
const { validationResult } = require('express-validator');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getUserNotifications = async (req, res) => {
  try {
    // Special handling for admin user
    if (req.isAdmin) {
      return res.json([]); // Admin has no notifications
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Sort notifications by date (newest first)
    const notifications = user.notifications.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id
// @access  Private
exports.markNotificationAsRead = async (req, res) => {
  try {
    // Special handling for admin user
    if (req.isAdmin) {
      return res.status(404).json({ message: 'Admin has no notifications' });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find notification by ID
    const notification = user.notifications.id(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Mark as read
    notification.read = true;
    await user.save();
    
    res.json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    // Special handling for admin user
    if (req.isAdmin) {
      return res.json({ message: 'Admin has no notifications' });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Mark all as read
    user.notifications.forEach(notification => {
      notification.read = true;
    });
    
    await user.save();
    
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    // Special handling for admin user
    if (req.isAdmin) {
      return res.status(404).json({ message: 'Admin has no notifications' });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove notification
    user.notifications.id(req.params.id).remove();
    await user.save();
    
    res.json({ message: 'Notification removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications
// @access  Private
exports.deleteAllNotifications = async (req, res) => {
  try {
    // Special handling for admin user
    if (req.isAdmin) {
      return res.json({ message: 'Admin has no notifications' });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Clear notifications
    user.notifications = [];
    await user.save();
    
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send notification to users (Admin only)
// @route   POST /api/notifications/send
// @access  Private (Admin)
exports.sendNotification = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    // Special handling for non-admin user
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Only admins can send notifications' });
    }

    const { title, message, type, recipients, bloodType, urgent } = req.body;
    
    // Create notification object
    const notification = {
      title,
      message,
      type: type || 'general',
      date: new Date(),
      read: false,
      urgent: urgent || false
    };
    
    let userCount = 0;
    
    // Send to specific recipients
    if (recipients && recipients.length > 0) {
      const users = await User.find({ _id: { $in: recipients } });
      
      for (const user of users) {
        user.notifications.push(notification);
        await user.save();
        
        // Send real-time notification
        socketUtils.notifyUser(user._id, socketUtils.NOTIFICATION_TYPES.ADMIN_ANNOUNCEMENT, {
          title,
          message,
          urgent
        });
        
        userCount++;
      }
    }
    // Send to users with specific blood type
    else if (bloodType) {
      const donors = await User.find({ 'donor.bloodType': bloodType });
      
      for (const user of donors) {
        user.notifications.push(notification);
        await user.save();
        
        // Send real-time notification
        socketUtils.notifyUser(user._id, socketUtils.NOTIFICATION_TYPES.ADMIN_ANNOUNCEMENT, {
          title,
          message,
          urgent
        });
        
        userCount++;
      }
      
      // Also notify via socket to blood type room
      socketUtils.notifyBloodType(bloodType, socketUtils.NOTIFICATION_TYPES.ADMIN_ANNOUNCEMENT, {
        title,
        message,
        urgent
      });
    }
    // Send to all users
    else {
      const users = await User.find();
      
      for (const user of users) {
        user.notifications.push(notification);
        await user.save();
        
        userCount++;
      }
      
      // Send to all connected users
      socketUtils.notifyAll(socketUtils.NOTIFICATION_TYPES.ADMIN_ANNOUNCEMENT, {
        title,
        message,
        urgent
      });
    }
    
    res.json({ 
      message: `Notification sent to ${userCount} users`,
      notification
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to add notification to a user
exports.addNotificationToUser = async (userId, notification) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return false;
    }
    
    user.notifications.push({
      title: notification.title,
      message: notification.message,
      type: notification.type || 'general',
      date: new Date(),
      read: false,
      urgent: notification.urgent || false
    });
    
    await user.save();
    
    // Send real-time notification
    socketUtils.notifyUser(userId, notification.type, notification);
    
    return true;
  } catch (err) {
    console.error('Error adding notification:', err);
    return false;
  }
};
