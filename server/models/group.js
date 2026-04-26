
// Mongoose schema for a Stokvel group, including embedded member subdocuments

const mongoose = require("mongoose");

// MEMBER SUBDOCUMENT SCHEMA
// (embedded inside the Group.members array)

const MemberSubSchema = new mongoose.Schema(
  {
    // Reference to the User document (from users collection)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true
    },
    // Denormalized username (stored here for quick access)
    username: {
      type: String,
      required: true,
      trim: true
    },
    // Denormalized email (stored here for quick access)
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    // Role within this specific group (admin, member, treasurer)
    role: {
      type: String,
      enum: ["admin", "member", "treasurer"],
      default: "member"
    },
    // Date when the member joined this group
    joinedAt: {
      type: Date,
      default: Date.now
    },
    // Whether the member is still active in the group
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { _id: false } // No separate _id for subdocuments (saves space)
);


// MAIN GROUP SCHEMA

const GroupSchema = new mongoose.Schema(
  {
    // Basic group information
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    freq: { type: String, required: true },
    cycle: { type: String, required: true },
    max: { type: Number, required: true },
    meetFreq: { type: String, required: true },
    meetDay: { type: String, required: true },
 
    payoutMethod: { type: String, required: true },
    rules: { type: String, required: true },

    // Creator of the group (reference to Users collection)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true
    },

    // Current admin of the group (reference to Users collection)
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true
    },

    // Array of member subdocuments (embedded)
    members: {
      type: [MemberSubSchema],
      default: []
    },

    // FIFO queue: index of the next member to receive payout
    nextPayoutIndex: {
      type: Number,
      default: 0
    },

    // Counter for how many payout rounds have been completed
    totalPayoutsCompleted: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true } // automatically adds createdAt and updatedAt
);





/**
 * Returns an array of active members ordered by join date (oldest first).
 * This implements the FIFO (First In, First Out) payout order.
 */
GroupSchema.methods.getFIFOOrder = function () {
  return this.members
    .filter((m) => m.isActive)                        // only active members
    .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt)); // earliest first
};

// Export the Group model
module.exports = mongoose.model("Group", GroupSchema);