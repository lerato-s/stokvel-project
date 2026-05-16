// models/group.js

const mongoose = require("mongoose")

// ==========================
// MEMBER SCHEMA
// ==========================

const memberSchema = new mongoose.Schema(
  {
    // Linked platform user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },

    // Username inside group
    username: {
      type: String,
      required: true,
      trim: true,
    },

    // Member email
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // Group role
    role: {
      type: String,
      enum: [
        "admin",
        "member",
        "treasurer",
      ],
      default: "member",
    },

    // Join date
    joinedAt: {
      type: Date,
      default: Date.now,
    },

    // Active member
    isActive: {
      type: Boolean,
      default: true,
    },

    // Invite token
    inviteToken: {
      type: String,
    },

    // Invite expiry
    inviteExpiry: {
      type: Date,
    },

    // ==========================
    // CONTRIBUTION TRACKING
    // ==========================

    contributions: [
      {
        // Example: 2026-07
        month: {
          type: String,
        },

        // Monthly contribution
        amount: {
          type: Number,
        },

        // Due date
        dueDate: {
          type: Date,
        },

        // Payment status
        status: {
          type: String,
          enum: [
            "paid",
            "missed",
            "overdue",
          ],
          default: "missed",
        },

        // Date paid
        paidAt: {
          type: Date,
        },

        // Prevent duplicate reminders
        reminderSent: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    _id: false,
  }
)

// ==========================
// GROUP SCHEMA
// ==========================

const GroupSchema = new mongoose.Schema(
  {
    // Group name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Contribution amount
    amount: {
      type: Number,
      required: true,
    },

    // Contribution frequency
    freq: {
      type: String,
      required: true,
      default: "monthly",
    },

    // Payout cycle
    cycle: {
      type: String,
      required: true,
      default: "monthly",
    },

    // Maximum members
    max: {
      type: Number,
      required: true,
    },

    // Meeting frequency
    meetFreq: {
      type: String,
    },

    // Meeting day
    meetDay: {
      type: String,
    },

    // Payout method
    payoutMethod: {
      type: String,
      required: true,
    },

    // Group rules
    rules: {
      type: String,
      required: true,
    },

    // User who created group
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    // Current admin
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    // Group members
    members: {
      type: [memberSchema],
      default: [],
    },

    // ==========================
    // FIFO PAYOUT TRACKING
    // ==========================

    // Next payout position
    nextPayoutIndex: {
      type: Number,
      default: 0,
    },

    // Total payouts completed
    totalPayoutsCompleted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// ==========================
// FIFO ORDER METHOD
// ==========================

GroupSchema.methods.getFIFOOrder =
  function () {

    return this.members

      // Only active members
      .filter(
        (member) =>
          member.isActive
      )

      // Oldest joined member first
      .sort(
        (a, b) =>
          new Date(a.joinedAt) -
          new Date(b.joinedAt)
      )
  }

// ==========================
// EXPORT MODEL
// ==========================

module.exports =
  mongoose.models.Group ||
  mongoose.model(
    "Group",
    GroupSchema
  )