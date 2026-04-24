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
  }
  // Removed `{ _id: false }` because each membership should have its own ID
);

// Static method to find memberships by user ID (returns array)
memberSchema.statics.findByUserId = async function(userId) {
  return await this.find({ userId }).populate('groupId'); // if you have a groupId field – adjust as needed
};

// If you have a `groupId` field, add it to the schema above.
// Otherwise, modify the query to suit your actual data structure.

module.exports = mongoose.model("Member", memberSchema);