const mongoose = require('mongoose')

const MeetingSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  date: { type: String, required: true },
  time: { type: String },
  venue: { type: String },
  agenda: { type: String },
  minutes: { type: String },
  status: { type: String, enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming' },
}, { timestamps: true })

module.exports = mongoose.model('Meeting', MeetingSchema)