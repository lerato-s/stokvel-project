const express = require('express');
const router = express.Router();
const { authenticate, attachUser } = require('../middleware/authMiddleware');
const {
  getUnreadNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');

// All notification routes require authentication
router.use(authenticate);
router.use(attachUser);

router.get('/notifications/unread', getUnreadNotifications);
router.put('/notifications/:id/read', markAsRead);
router.put('/notifications/mark-all-read', markAllAsRead);

module.exports = router;