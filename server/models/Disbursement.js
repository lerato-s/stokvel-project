const mongoose = require("mongoose");

const disbursementSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, required: true }, // member's _id inside group.members
  memberName: { type: String, required: true },
  month: { type: String, required: true }, // YYYY-MM
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  reference: String,
  note: String,
  paidAt: Date,
  transactionId: String,
}, { timestamps: true });

module.exports = mongoose.model("Disbursement", disbursementSchema);