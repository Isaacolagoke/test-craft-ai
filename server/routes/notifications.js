const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const auth = require('../middleware/auth');

// Get all notifications for the current user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notifications as read
router.put('/read', auth, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        userId: req.user._id
      },
      { $set: { read: true } }
    );

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// Get unread notification count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      read: false
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching unread count' });
  }
});

module.exports = router; 