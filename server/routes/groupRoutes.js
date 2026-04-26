// groupRoutes.js
// Add to index.js:
//   const groupRoutes = require("./groupRoutes")
//   app.use("/api", groupRoutes)
//
// New .env vars needed:
//   EMAIL_USER=your_gmail@gmail.com
//   EMAIL_PASS=your_gmail_app_password
//   EMAIL_FROM=your_gmail@gmail.com
const User = require("../models/users")  // adjust path if needed
const express  = require("express")
const mongoose = require("mongoose")
const jwt      = require("jsonwebtoken")
const crypto   = require("crypto")
const router   = express.Router()
const {
  sendInviteEmail,
  sendMeetingNotification,
  sendMissingContributionEmail,
  sendMeetingMinutes,
  sendRoleAssignedEmail,
} = require("../services/emailService")

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
const groupSchema = new mongoose.Schema({
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name:         { type: String, required: true, trim: true },
  amount:       Number,
  freq:         String,
  cycle:        String,
  max:          Number,
  meetFreq:     String,
  meetDay:      String,
  payoutMethod: String,
  rules:        String,
}, { timestamps: true })

const Group = mongoose.model("Group", groupSchema)

const memberSchema = new mongoose.Schema({
  group:        { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  name:         { type: String, required: true, trim: true },
  contact:      { type: String, required: true },
  role:         { type: String, enum: ["Admin", "Treasurer", "Member"], default: "Member" },
  status:       { type: String, enum: ["pending", "active", "inactive"], default: "pending" },
  initials:     String,
  slot:         { type: Number, default: 0 },
  inviteToken:  String,
  inviteExpiry: Date,
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true })

const Member = mongoose.model("Member", memberSchema)

const meetingSchema = new mongoose.Schema({
  group:         { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  date:          { type: String, required: true },
  time:          String,
  venue:         { type: String, required: true, trim: true },
  status:        { type: String, enum: ["upcoming", "completed", "cancelled"], default: "upcoming" },
  agenda:        String,
  minutes: {
  summary: String,
  decisions: [String],
  actions: [String],
  attendance: Object
},
  minutesSentAt: Date,
  link:          String,
  notes:         String,
}, { timestamps: true })

const Meeting = mongoose.model("Meeting", meetingSchema)

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name) {
  return name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function formatDate(d) {
  if (!d) return "—"
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "2-digit", month: "long", year: "numeric",
  })
}

// ── Group routes ──────────────────────────────────────────────────────────────

// GET /api/groups
router.get("/groups", protect, async (req, res) => {
  try {
    const groups = await Group.find({ owner: req.userId }).sort("-createdAt")
    res.json(groups)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/group — create group + auto assign creator as Admin
router.post("/group", protect, async (req, res) => {
  try {
    const { name, amount, freq, cycle, max, meetFreq, meetDay, payoutMethod, rules } = req.body

    if (!name?.trim())
      return res.status(400).json({ error: "Group name is required" })

    const creator = await User.findById(req.userId)
    if (!creator) return res.status(404).json({ error: "User not found" })

    const group = await Group.create({
      owner: req.userId,
      name, amount, freq, cycle, max,
      meetFreq, meetDay,  payoutMethod, rules,
    })

    // Auto-assign creator as Admin member
    await Member.create({
      group:    group._id,
      name:     creator.username || creator.name || creator.email,
      contact:  creator.email,
      role:     "Admin",
      status:   "active",
      initials: getInitials(creator.username || creator.name || creator.email),
      slot:     1,
      userId:   creator._id,
    })

    res.status(201).json(group)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/group/:id
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
    await Member.deleteMany({ group: req.params.id })
    await Meeting.deleteMany({ group: req.params.id })
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
    if (!groupId) return res.status(400).json({ error: "groupId required" })

    const group = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group) return res.status(404).json({ error: "Group not found" })

    const members = await Member.find({ group: groupId }).sort("slot")
    res.json(members)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/members — invite member via email
router.post("/members", protect, async (req, res) => {
  try {
    const { name, contact, groupId } = req.body

    if (!name?.trim() || !contact?.trim())
      return res.status(400).json({ error: "Name and email are required" })
    if (!groupId)
      return res.status(400).json({ error: "groupId is required" })
    if (!contact.includes("@"))
      return res.status(400).json({ error: "A valid email address is required" })

    const group = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group) return res.status(404).json({ error: "Group not found" })

    const existing = await Member.findOne({ group: groupId, contact: contact.toLowerCase().trim() })
    if (existing) return res.status(409).json({ error: "This email has already been invited" })

    const inviteToken  = crypto.randomBytes(32).toString("hex")
    const inviteExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000)

    const count  = await Member.countDocuments({ group: groupId })
    const member = await Member.create({
      group:       groupId,
      name:        name.trim(),
      contact:     contact.toLowerCase().trim(),
      role:        "Member",
      status:      "pending",
      initials:    getInitials(name),
      slot:        count + 1,
      inviteToken,
      inviteExpiry,
    })

    const inviter = await User.findById(req.userId)
    const inviteLink = `${process.env.CLIENT_URL}/accept-invite?token=${inviteToken}&groupId=${groupId}`

    try {
      await sendInviteEmail({
        toEmail:     member.contact,
        toName:      member.name,
        groupName:   group.name,
        inviterName: inviter?.username || inviter?.name || "Admin",
        inviteLink,
      })
    } catch (emailErr) {
      console.error("Invite email failed:", emailErr.message)
    }

    res.status(201).json({ ...member.toObject(), inviteLink })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/members/accept-invite
router.post("/members/accept-invite", async (req, res) => {
  try {
    const { token, groupId } = req.body

    if (!token || !groupId)
      return res.status(400).json({ error: "Token and groupId are required" })

    const member = await Member.findOne({
      group:        groupId,
      inviteToken:  token,
      inviteExpiry: { $gt: new Date() },
    })

    if (!member) return res.status(400).json({ error: "Invalid or expired invite link" })

    member.status       = "active"
    member.inviteToken  = undefined
    member.inviteExpiry = undefined
    await member.save()

    res.json({ message: "Invite accepted successfully", member })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Temporary debug route — remove after testing
router.get("/test-email",async (req, res) => {
  try {
    await sendInviteEmail({
      toEmail:     "your_actual_email@gmail.com", // ← put your own email here
      toName:      "Test User",
      groupName:   "Test Group",
      inviterName: "Admin",
      inviteLink:  "https://example.com",
    })
    res.json({ message: "✅ Email sent successfully" })
  } catch (err) {
    res.json({ error: "❌ Email failed", reason: err.message, stack: err.stack })
  }
})

// PATCH /api/members/:id/role — admin assigns treasurer or changes role
router.patch("/members/:id/role", protect, async (req, res) => {
  try {
    const { role } = req.body

    if (!["Admin", "Treasurer", "Member"].includes(role))
      return res.status(400).json({ error: "Invalid role. Must be Admin, Treasurer or Member" })

    const member = await Member.findById(req.params.id)
    if (!member) return res.status(404).json({ error: "Member not found" })

    const group = await Group.findOne({ _id: member.group, owner: req.userId })
    if (!group) return res.status(403).json({ error: "Only the group admin can assign roles" })

    // Only one treasurer allowed per group — demote existing treasurer
    if (role === "Treasurer") {
      await Member.updateMany(
        { group: member.group, role: "Treasurer" },
        { role: "Member" }
      )
    }

    member.role = role
    await member.save()

    try {
      await sendRoleAssignedEmail({
        toEmail:   member.contact,
        toName:    member.name,
        groupName: group.name,
        role,
      })
    } catch (emailErr) {
      console.error("Role email failed:", emailErr.message)
    }

    res.json(member)
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

// PUT /api/members/reorder
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
    if (!groupId) return res.status(400).json({ error: "groupId required" })

    const group = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group) return res.status(404).json({ error: "Group not found" })

    const meetings = await Meeting.find({ group: groupId }).sort("date")
    res.json(meetings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single meeting by ID
router.get("/meetings/:id", protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /api/meetings — create meeting and notify all active members
router.post("/meetings", protect, async (req, res) => {
  try {
    const { date, time, venue, link, notes, agenda, groupId } = req.body

    if (!date || !venue?.trim())
      return res.status(400).json({ error: "Date and venue are required" })
    if (!groupId)
      return res.status(400).json({ error: "groupId is required" })

    const group = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group) return res.status(404).json({ error: "Group not found" })
console.log("Creating meeting with link:", link)

    const isPast = new Date(date) < new Date();


    const meeting = await Meeting.create({
      group: groupId,
      date, time,
      venue:  venue.trim(),
      link: link ? link.trim() : null,
      agenda: agenda?.trim(),
      notes:  notes?.trim(),
      status: isPast ? "completed" : "upcoming",
    })

    // Notify all active members
    const members = await Member.find({ group: groupId, status: "active" })
    await Promise.allSettled(members.map((m) =>
      sendMeetingNotification({
        toEmail:     m.contact,
        toName:      m.name,
        groupName:   group.name,
        meetingDate: formatDate(date),
        meetingTime: time,
        venue,
        link: req.body.link,
        agenda,
      }).catch((err) => console.error(`Notify failed for ${m.contact}:`, err.message))
    ))

    res.status(201).json(meeting)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/meetings/:id — update, add agenda or minutes
router.patch("/meetings/:id", protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate("group")
    if (!meeting || meeting.group.owner.toString() !== req.userId)
      return res.status(404).json({ error: "Meeting not found" })

    const wasMinutesEmpty = !meeting.minutes
    Object.assign(meeting, req.body)
    await meeting.save()

    // Email minutes to all active members when first added
    if (wasMinutesEmpty && req.body.minutes) {
      const members = await Member.find({ group: meeting.group._id, status: "active" })
      await Promise.allSettled(members.map((m) =>
        sendMeetingMinutes({
          toEmail:     m.contact,
          toName:      m.name,
          groupName:   meeting.group.name,
          meetingDate: formatDate(meeting.date),
          minutes:     req.body.minutes,
        }).catch((err) => console.error(`Minutes email failed for ${m.contact}:`, err.message))
      ))
      meeting.minutesSentAt = new Date()
      await meeting.save()
    }

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

// ── Treasurer: flag missing contributions ─────────────────────────────────────
// POST /api/flag-missing
router.post("/flag-missing", protect, async (req, res) => {
  try {
    const { groupId, month } = req.body

    if (!groupId || !month)
      return res.status(400).json({ error: "groupId and month are required" })

    const group = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group) return res.status(404).json({ error: "Group not found" })

    // Safely get Contribution model wherever it was registered
    const Contribution = mongoose.models.Contribution
    if (!Contribution)
      return res.status(500).json({ error: "Contribution model not loaded yet" })

    const paid    = await Contribution.find({ group: groupId, month, status: "paid" })
    const paidIds = new Set(paid.map((c) => c.member.toString()))

    const members = await Member.find({ group: groupId, status: "active" })
    const unpaid  = members.filter((m) => !paidIds.has(m._id.toString()))

    if (unpaid.length === 0)
      return res.json({ message: "All members have paid this month", flagged: 0 })

    // Send emails to unpaid members
    const results = await Promise.allSettled(unpaid.map((m) =>
      sendMissingContributionEmail({
        toEmail:   m.contact,
        toName:    m.name,
        groupName: group.name,
        month,
        amount:    group.amount,
      })
    ))

    // Count how many emails actually succeeded
    const sent   = results.filter(r => r.status === "fulfilled").length
    const failed = results.filter(r => r.status === "rejected").length

    if (failed > 0) {
      results.forEach((r, i) => {
        if (r.status === "rejected")
          console.error(`Flag email failed for ${unpaid[i].contact}:`, r.reason?.message)
      })
    }

    res.json({
      message: `Flagged ${unpaid.length} members — ${sent} emails sent${failed > 0 ? `, ${failed} failed` : ""}`,
      flagged: unpaid.length,
      members: unpaid.map((m) => ({ name: m.name, contact: m.contact })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router