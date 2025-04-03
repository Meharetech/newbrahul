const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const notificationController = require('../controllers/notification.controller');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', auth, notificationController.getUserNotifications);

// @route   PUT /api/notifications/:id
// @desc    Mark notification as read
// @access  Private
router.put('/:id', auth, notificationController.markNotificationAsRead);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, notificationController.markAllNotificationsAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', auth, notificationController.deleteNotification);

// @route   DELETE /api/notifications
// @desc    Delete all notifications
// @access  Private
router.delete('/', auth, notificationController.deleteAllNotifications);

// @route   POST /api/notifications/send
// @desc    Send notification to users (Admin only)
// @access  Private (Admin)
router.post(
  '/send',
  [
    auth,
    checkRole(['admin']),
    [
      check('title', 'Title is required').not().isEmpty(),
      check('message', 'Message is required').not().isEmpty(),
      check('type', 'Type must be a string').optional().isString(),
      check('recipients', 'Recipients must be an array').optional().isArray(),
      check('bloodType', 'Blood type must be a string').optional().isString(),
      check('urgent', 'Urgent must be a boolean').optional().isBoolean()
    ]
  ],
  notificationController.sendNotification
);

module.exports = router;
