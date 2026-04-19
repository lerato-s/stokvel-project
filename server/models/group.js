const mongoose = require("mongoose");

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
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", GroupSchema);