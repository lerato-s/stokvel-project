const mongoose = require("mongoose");
const memberSchema = require("./member"); // import member schema

// Main group schema
const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    freq: { type: String, required: true },
    cycle: { type: String, required: true },
    max: { type: Number, required: true },
    meetFreq: { type: String, required: true },
    meetDay: { type: String, required: true },
    meetWeek: { type: String, required: true },
    payoutMethod: { type: String, required: true },
    rules: { type: String, required: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true // creator id
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true // current admin id
    },

    members: {
      type: [memberSchema], // embedded members array
      default: []
    },

    nextPayoutIndex: {
      type: Number,
      default: 0 // tracks FIFO position
    },

    totalPayoutsCompleted: {
      type: Number,
      default: 0 // completed payouts
    }
  },
  { timestamps: true } // adds createdAt and updatedAt
);

// FIFO ordering method
GroupSchema.methods.getFIFOOrder = function () {
  return this.members
    .filter((m) => m.isActive) // only active members
    .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt)); // earliest first
};

module.exports = mongoose.model("Group", GroupSchema);