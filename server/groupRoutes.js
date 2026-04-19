// groupRoutes.js
// Add to index.js:
//   const groupRoutes = require("./groupRoutes")
//   app.use("/api", groupRoutes)

const express  = require("express")
const mongoose = require("mongoose")
const jwt      = require("jsonwebtoken")
const router   = express.Router()

// ── Auth middleware ───────────────────────────────────────────────────────────
function protect(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "No token provided" })
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET)
    req.userId = decoded.id
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}

// ── Models ────────────────────────────────────────────────────────────────────

// Group — no unique: true on owner so one user can have many groups
const groupSchema = new mongoose.Schema({
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name:         { type: String, required: true, trim: true },
  amount:       Number,
  freq:         String,
  cycle:        String,
  max:          Number,
  meetFreq:     String,
  meetDay:      String,
  meetWeek:     String,
  payoutMethod: String,
  rules:        String,
}, { timestamps: true })

const Group = mongoose.model("Group", groupSchema)

// Member
const memberSchema = new mongoose.Schema({
  group:    { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  name:     { type: String, required: true, trim: true },
  contact:  { type: String, required: true },
  role:     { type: String, default: "Member" },
  status:   { type: String, enum: ["pending", "active", "inactive"], default: "pending" },
  initials: String,
  slot:     { type: Number, default: 0 },
}, { timestamps: true })

const Member = mongoose.model("Member", memberSchema)

// Meeting
const meetingSchema = new mongoose.Schema({
  group:  { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  date:   { type: String, required: true },
  time:   String,
  venue:  { type: String, required: true, trim: true },
  status: { type: String, enum: ["upcoming", "completed", "cancelled"], default: "upcoming" },
  notes:  String,
}, { timestamps: true })

const Meeting = mongoose.model("Meeting", meetingSchema)

// ── Helper ────────────────────────────────────────────────────────────────────
function getInitials(name) {
  return name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

// ── Group routes ──────────────────────────────────────────────────────────────

// GET /api/groups — all groups for this user (for the list screen)
router.get("/groups", protect, async (req, res) => {
  try {
    const groups = await Group.find({ owner: req.userId }).sort("-createdAt")
    res.json(groups)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/group — single group (most recent, kept for backwards compat)
router.get("/group", protect, async (req, res) => {
  try {
    const group = await Group.findOne({ owner: req.userId }).sort("-createdAt")
    res.json(group || {})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/group — always creates a NEW group
router.post("/group", protect, async (req, res) => {
  try {
    const { name, amount, freq, cycle, max, meetFreq, meetDay, meetWeek, payoutMethod, rules } = req.body

    if (!name?.trim())
      return res.status(400).json({ error: "Group name is required" })

    const group = await Group.create({
      owner: req.userId,
      name, amount, freq, cycle, max,
      meetFreq, meetDay, meetWeek, payoutMethod, rules,
    })

    res.status(201).json(group)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/group/:id — update an existing group
router.patch("/group/:id", protect, async (req, res) => {
  try {
    const group = await Group.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      req.body,
      { new: true }
    )
    if (!group) return res.status(404).json({ error: "Group not found" })
    res.json(group)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/group/:id
router.delete("/group/:id", protect, async (req, res) => {
  try {
    await Group.findOneAndDelete({ _id: req.params.id, owner: req.userId })
    // also clean up members and meetings
    const groupId = req.params.id
    await Member.deleteMany({ group: groupId })
    await Meeting.deleteMany({ group: groupId })
    res.json({ message: "Group deleted" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Member routes ─────────────────────────────────────────────────────────────

// GET /api/members?groupId=xxx
router.get("/members", protect, async (req, res) => {
  try {
    const { groupId } = req.query
    if (!groupId)
      return res.status(400).json({ error: "groupId query param required" })

    // make sure this group belongs to the user
    const group = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group) return res.status(404).json({ error: "Group not found" })

    const members = await Member.find({ group: groupId }).sort("slot")
    res.json(members)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/members
router.post("/members", protect, async (req, res) => {
  try {
    const { name, contact, role, groupId } = req.body

    if (!name?.trim() || !contact?.trim())
      return res.status(400).json({ error: "Name and contact are required" })
    if (!groupId)
      return res.status(400).json({ error: "groupId is required" })

    const group = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group) return res.status(404).json({ error: "Group not found" })

    const count  = await Member.countDocuments({ group: groupId })
    const member = await Member.create({
      group:    groupId,
      name:     name.trim(),
      contact:  contact.trim(),
      role:     role || "Member",
      initials: getInitials(name),
      slot:     count + 1,
    })

    res.status(201).json(member)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/members/:id
router.patch("/members/:id", protect, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).populate("group")
    if (!member || member.group.owner.toString() !== req.userId)
      return res.status(404).json({ error: "Member not found" })

    Object.assign(member, req.body)
    await member.save()
    res.json(member)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/members/:id
router.delete("/members/:id", protect, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).populate("group")
    if (!member || member.group.owner.toString() !== req.userId)
      return res.status(404).json({ error: "Member not found" })

    await member.deleteOne()
    res.json({ message: "Member removed" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/members/reorder — body: { order: [{ id, slot }] }
router.put("/members/reorder", protect, async (req, res) => {
  try {
    const { order } = req.body
    if (!Array.isArray(order))
      return res.status(400).json({ error: "order must be an array" })

    await Promise.all(order.map(({ id, slot }) => Member.findByIdAndUpdate(id, { slot })))
    res.json({ message: "Order saved" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Meeting routes ────────────────────────────────────────────────────────────

// GET /api/meetings?groupId=xxx
router.get("/meetings", protect, async (req, res) => {
  try {
    const { groupId } = req.query
    if (!groupId)
      return res.status(400).json({ error: "groupId query param required" })

    const group = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group) return res.status(404).json({ error: "Group not found" })

    const meetings = await Meeting.find({ group: groupId }).sort("date")
    res.json(meetings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/meetings
router.post("/meetings", protect, async (req, res) => {
  try {
    const { date, time, venue, notes, groupId } = req.body

    if (!date || !venue?.trim())
      return res.status(400).json({ error: "Date and venue are required" })
    if (!groupId)
      return res.status(400).json({ error: "groupId is required" })

    const group = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group) return res.status(404).json({ error: "Group not found" })

    const meeting = await Meeting.create({
      group: groupId,
      date, time,
      venue: venue.trim(),
      notes: notes?.trim(),
    })

    res.status(201).json(meeting)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/meetings/:id
router.patch("/meetings/:id", protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate("group")
    if (!meeting || meeting.group.owner.toString() !== req.userId)
      return res.status(404).json({ error: "Meeting not found" })

    Object.assign(meeting, req.body)
    await meeting.save()
    res.json(meeting)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/meetings/:id
router.delete("/meetings/:id", protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate("group")
    if (!meeting || meeting.group.owner.toString() !== req.userId)
      return res.status(404).json({ error: "Meeting not found" })

    await meeting.deleteOne()
    res.json({ message: "Meeting deleted" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
