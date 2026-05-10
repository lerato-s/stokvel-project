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
      default: true
    }
  },
  { _id: false }
);

module.exports = mongoose.model("Member", memberSchema);