const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true
    },
    username: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["admin", "member", "treasurer"],
      default: "member"
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
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
      required: true
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true
    },

    members: {
      type: [memberSchema],
      default: []
    },

    nextPayoutIndex: {
      type: Number,
      default: 0
    },

    totalPayoutsCompleted: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

GroupSchema.methods.getFIFOOrder = function () {
  return this.members
    .filter((m) => m.isActive)
    .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
};

module.exports = mongoose.model("Group", GroupSchema);