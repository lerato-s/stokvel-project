const mongoose = require("mongoose")

// Structure for group members
const memberSchema = new mongoose.Schema(
  {
    // User account reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    // Username inside group
    username: {
      type: String,
      required: true,
    },

    // Member email
    email: {
      type: String,
      required: true,
    },

    // Group role
    role: {
      type: String,
      enum: ["admin", "member", "treasurer"],
      default: "member",
    },

    // Join date
    joinedAt: {
      type: Date,
      default: Date.now,
    },

    // Member active status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
)

// Main group schema
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
    },

    // Payout cycle
    cycle: {
      type: String,
      required: true,
    },

    // Maximum members
    max: {
      type: Number,
      required: true,
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

    // User who created the group
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    // Current main admin
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

    // FIFO payout tracking
    nextPayoutIndex: {
      type: Number,
      default: 0,
    },

    totalPayoutsCompleted: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

// FIFO order helper
GroupSchema.methods.getFIFOOrder = function () {
  return this.members
    .filter((m) => m.isActive)
    .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt))
}

module.exports = mongoose.model("Group", GroupSchema)