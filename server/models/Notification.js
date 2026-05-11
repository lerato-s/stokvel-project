const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['missed_payment', 'payment_reminder', 'payout_confirmed'], required: true },
  title: String,
  message: String,
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // e.g., contributionId, groupId
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);