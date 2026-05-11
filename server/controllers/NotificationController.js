const Notification = require('../models/Notification');
const User = require('../models/users');

// Get unread notifications for the logged‑in user
const getUnreadNotifications = async (req, res) => {
  try {
    const user = await User.findOne({ auth0Id: req.userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notifications = await Notification.find({
      userId: user._id,
      isRead: false
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark a single notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    const user = await User.findOne({ auth0Id: req.userId });
    if (notification.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    notification.isRead = true;
    await notification.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark all notifications as read (optional)
const markAllAsRead = async (req, res) => {
  try {
    const user = await User.findOne({ auth0Id: req.userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await Notification.updateMany(
      { userId: user._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getUnreadNotifications, markAsRead, markAllAsRead };