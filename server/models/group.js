const mongoose = require('mongoose')

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number },
  freq: { type: String },
  cycle: { type: String },
  max: { type: Number },
  meetFreq: { type: String },
  meetDay: { type: String },
  meetWeek: { type: String },
  payoutMethod: { type: String },
  rules: { type: String },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  treasurerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', default: null },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
}, { timestamps: true })

module.exports = mongoose.model('Group', GroupSchema)