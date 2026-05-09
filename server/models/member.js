const mongoose = require("mongoose");

// Schema for a member inside a group
const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true
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
      enum: ["admin", "member", "treasurer"], // allowed roles
      default: "member"
    },
    joinedAt: {
      type: Date,
      default: Date.now // auto set join time
    },
    isActive: {
      type: Boolean,
      default: true // active member flag
    }
  },
  { _id: false } // no separate id for each member
);

module.exports = memberSchema;