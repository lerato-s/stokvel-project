const mongoose = require("mongoose");
const memberSchema = require("./member");

// Main group schema
const GroupSchema = new mongoose.Schema(
{
  // Group name
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Monthly contribution amount
  amount: {
    type: Number,
    required: true
  },

  // Contribution frequency
  freq: {
    type: String,
    required: true,
    default: "monthly"
  },

  // Payout cycle
  cycle: {
    type: String,
    required: true,
    default: "monthly"
  },

  // Maximum members
  max: {
    type: Number,
    required: true
  },

  // Meeting settings
  meetFreq: {
    type: String,
    required: true
  },

  meetDay: {
    type: String,
    required: true
  },

  // Payment method
  payoutMethod: {
    type: String,
    required: true
  },

  // Group rules
  rules: {
    type: String,
    required: true
  },

  // Group creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },

  // Current admin
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },

  // Group members
  members: {
    type: [memberSchema],
    default: []
  },

  // ==========================
  // FIFO PAYOUT TRACKING
  // ==========================

  // Tracks who receives payout next
  nextPayoutIndex: {
    type: Number,
    default: 0
  },

  // Number of completed payouts
  totalPayoutsCompleted: {
    type: Number,
    default: 0
  }

},
{
  timestamps: true
}
);

// ==========================
// FIFO ORDER METHOD
// ==========================

GroupSchema.methods.getFIFOOrder = function () {

  return this.members

    // Only active members
    .filter((member) => member.isActive)

    // Oldest joined member first
    .sort(
      (a, b) =>
        new Date(a.joinedAt) -
        new Date(b.joinedAt)
    );
};

module.exports =
  mongoose.models.Group ||
  mongoose.model(
    "Group",
    GroupSchema
  );