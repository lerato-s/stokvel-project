const mongoose = require("mongoose");

// Schema for a member inside a group
const memberSchema = new mongoose.Schema(
{
  // User account reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },

  // Username
  username: {
    type: String,
    required: true,
    trim: true
  },

  // Email
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },

  // Group role
  role: {
    type: String,
    enum: [
      "admin",
      "member",
      "treasurer"
    ],
    default: "member"
  },

  // Date joined
  joinedAt: {
    type: Date,
    default: Date.now
  },

  // Active member
  isActive: {
    type: Boolean,
    default: true
  },

  // ==========================
  // CONTRIBUTION TRACKING
  // ==========================

  contributions: [
    {
      // Example: 2026-07
      month: {
        type: String,
        required: true
      },

      // Monthly amount
      amount: {
        type: Number,
        required: true
      },

      // Due date
      dueDate: {
        type: Date,
        required: true
      },

      // Payment status
      status: {
        type: String,
        enum: [
          "paid",
          "missed",
          "overdue"
        ],
        default: "missed"
      },

      // Payment timestamp
      paidAt: {
        type: Date
      },

      // Prevent duplicate reminders
      reminderSent: {
        type: Boolean,
        default: false
      }
    }
  ]

},
{
  _id: false
}
);

module.exports = memberSchema;