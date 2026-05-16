const mongoose = require("mongoose");

// Schema for a member inside a group
const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users"
    },
    username: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
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
      default: false
    },
    inviteToken: {
      type: String
    },
    inviteExpiry: {
      type: Date
    },
    contributions: [
      {
        month: { type: String, required: true },
        amount: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        status: {
          type: String,
          enum: ["paid", "missed", "overdue"],
          default: "missed"
        },
        paidAt: { type: Date },
        reminderSent: { type: Boolean, default: false }
      }
    ]
  },
  { _id: false }
);

//Export as a model, not just schema
module.exports = mongoose.model("Member", memberSchema);
