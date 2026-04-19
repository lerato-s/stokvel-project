const mongoose = require('mongoose')

const ContributionSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'missed'], default: 'pending' },
  date: { type: Date, default: Date.now },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', default: null },
}, { timestamps: true })

module.exports = mongoose.model('Contribution', ContributionSchema)