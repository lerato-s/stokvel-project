// groupRoutes.js
const User = require("../models/users");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const router = express.Router();
const {
  sendInviteEmail,
  sendMeetingNotification,
  sendMissingContributionEmail,
  sendMeetingMinutes,
  sendRoleAssignedEmail,
} = require("../services/emailService");
const Notification = require("../models/Notification");

// ── Auth middleware ───────────────────────────────────────────────────────────
function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── Models ────────────────────────────────────────────────────────────────────
const groupSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  amount: Number,
  freq: String,
  cycle: String,
  max: Number,
  meetFreq: String,
  meetDay: String,
  payoutMethod: String,
  rules: String,
  nextPayoutIndex: { type: Number, default: 0 },
  totalPayoutsCompleted: { type: Number, default: 0 },
}, { timestamps: true });

const Group = mongoose.model("Group", groupSchema);

const memberSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  name: { type: String, required: true, trim: true },
  contact: { type: String, required: true },
  role: { type: String, enum: ["Admin", "Treasurer", "Member"], default: "Member" },
  status: { type: String, enum: ["pending", "active", "inactive"], default: "pending" },
  initials: String,
  slot: { type: Number, default: 0 },
  inviteToken: String,
  inviteExpiry: Date,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  contributions: [
    {
      month: { type: String, required: true },
      amount: { type: Number, required: true },
      dueDate: Date,
      status: { type: String, enum: ["paid", "missed", "overdue"], default: "missed" },
      paidAt: Date,
      reminderSent: { type: Boolean, default: false },
    },
  ],
}, { timestamps: true });

const Member = mongoose.model("Member", memberSchema);

const meetingSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  date: { type: String, required: true },
  time: String,
  venue: { type: String, required: true, trim: true },
  status: { type: String, enum: ["upcoming", "completed", "cancelled"], default: "upcoming" },
  agenda: String,
  minutes: {
    summary: String,
    decisions: [String],
    actions: [String],
    attendance: Object,
  },
  minutesSentAt: Date,
  link: String,
  notes: String,
}, { timestamps: true });

const Meeting = mongoose.model("Meeting", meetingSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name) {
  return name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

async function getGroupIfAuthorised(groupId, userId, roles = []) {
  const group = await Group.findById(groupId);
  if (!group) return { group: null, error: "Group not found", status: 404 };

  const isOwner = group.owner.toString() === userId;
  if (isOwner) return { group };

  const currentUser = await User.findById(userId).select("email");
  const member = await Member.findOne({
    group: groupId,
    status: "active",
    role: { $in: roles },
    $or: [
      { userId },
      { contact: currentUser?.email?.toLowerCase() },
    ],
  });

  if (!member) return { group: null, error: "Access denied", status: 403 };
  return { group };
}

// ── Group routes ──────────────────────────────────────────────────────────────

// POST /api/group
router.post("/group", protect, async (req, res) => {
  try {
    const { name, amount, freq, cycle, max, meetFreq, meetDay, payoutMethod, rules } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Group name is required" });

    const group = await Group.create({
      owner: req.userId,
      name: name.trim(),
      amount, freq, cycle, max, meetFreq, meetDay, payoutMethod, rules,
    });

    const creator = await User.findById(req.userId);
    await Member.create({
      group: group._id,
      name: creator.username || creator.name,
      contact: creator.email,
      role: "Admin",
      status: "active",
      initials: getInitials(creator.username || creator.name),
      slot: 1,
      userId: req.userId,
    });

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups – FIXED: exclude owned groups from memberGroups
router.get("/groups", protect, async (req, res) => {
  try {
    const ownedGroups = await Group.find({ owner: req.userId }).sort("-createdAt");

    const memberQuery = { status: "active", userId: req.userId };
    try {
      const currentUser = await User.findById(req.userId).select("email");
      if (currentUser?.email) {
        memberQuery.$or = [
          { userId: req.userId },
          { contact: currentUser.email.toLowerCase() },
        ];
        delete memberQuery.userId;
      }
    } catch (userErr) {
      console.error("User lookup failed, falling back to userId only:", userErr.message);
    }

    const memberships = await Member.find(memberQuery).populate("group");
    // Exclude groups that the user already owns (avoids duplicates)
    const memberGroups = memberships
      .map((m) => m.group)
      .filter((g) => g.owner.toString() !== req.userId);

    res.json([...ownedGroups, ...memberGroups]);
  } catch (err) {
    console.error("GET /groups error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/group/:id
router.patch("/group/:id", protect, async (req, res) => {
  try {
    const group = await Group.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      req.body,
      { new: true }
    );
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/group/:id
router.delete("/group/:id", protect, async (req, res) => {
  try {
    await Group.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    await Member.deleteMany({ group: req.params.id });
    await Meeting.deleteMany({ group: req.params.id });
    res.json({ message: "Group deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Member routes ─────────────────────────────────────────────────────────────

// GET /api/members?groupId=xxx
router.get("/members", protect, async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) return res.status(400).json({ error: "groupId required" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isOwner = group.owner.toString() === req.userId;
    if (!isOwner) {
      const currentUser = await User.findById(req.userId).select("email");
      const isMember = await Member.findOne({
        group: groupId,
        status: "active",
        $or: [
          { userId: req.userId },
          { contact: currentUser?.email?.toLowerCase() },
        ],
      });
      if (!isMember) return res.status(403).json({ error: "Access denied" });
    }

    const members = await Member.find({ group: groupId }).sort("slot");
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/me?groupId=xxx
router.get("/members/me", protect, async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) return res.status(400).json({ error: "groupId required" });

    const currentUser = await User.findById(req.userId).select("email");
    const member = await Member.findOne({
      group: groupId,
      status: "active",
      $or: [
        { userId: req.userId },
        { contact: currentUser?.email?.toLowerCase() },
      ],
    });

    if (!member) return res.status(404).json({ error: "You are not a member of this group" });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members – invite
router.post("/members", protect, async (req, res) => {
  try {
    const { name, contact, groupId } = req.body;
    if (!name?.trim() || !contact?.trim()) return res.status(400).json({ error: "Name and email are required" });
    if (!groupId) return res.status(400).json({ error: "groupId is required" });
    if (!contact.includes("@")) return res.status(400).json({ error: "A valid email address is required" });

    const group = await Group.findOne({ _id: groupId, owner: req.userId });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const existing = await Member.findOne({ group: groupId, contact: contact.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: "This email has already been invited" });

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const count = await Member.countDocuments({ group: groupId });

    const member = await Member.create({
      group: groupId,
      name: name.trim(),
      contact: contact.toLowerCase().trim(),
      role: "Member",
      status: "pending",
      initials: getInitials(name),
      slot: count + 1,
      inviteToken,
      inviteExpiry,
    });

    const inviter = await User.findById(req.userId);
    const inviteLink = `${process.env.CLIENT_URL}/accept-invite?token=${inviteToken}&groupId=${groupId}`;

    try {
      await sendInviteEmail({
        toEmail: member.contact,
        toName: member.name,
        groupName: group.name,
        inviterName: inviter?.username || inviter?.name || "Admin",
        inviteLink,
      });
    } catch (emailErr) {
      console.error("Invite email failed:", emailErr.message);
    }

    res.status(201).json({ ...member.toObject(), inviteLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/accept-invite
router.post("/members/accept-invite", async (req, res) => {
  try {
    const { token, groupId } = req.body;
    if (!token || !groupId) return res.status(400).json({ error: "Token and groupId are required" });

    const member = await Member.findOne({
      group: groupId,
      inviteToken: token,
      inviteExpiry: { $gt: new Date() },
    });

    if (!member) return res.status(400).json({ error: "Invalid or expired invite link" });

    const user = await User.findOne({ email: member.contact });
    member.status = "active";
    member.inviteToken = undefined;
    member.inviteExpiry = undefined;
    if (user) member.userId = user._id;
    await member.save();

    res.json({
      message: "Invite accepted successfully",
      member,
      needsRegistration: !user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/members/:id/role
router.patch("/members/:id/role", protect, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["Admin", "Treasurer", "Member"].includes(role))
      return res.status(400).json({ error: "Invalid role" });

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: "Member not found" });

    const group = await Group.findOne({ _id: member.group, owner: req.userId });
    if (!group) return res.status(403).json({ error: "Only the group admin can assign roles" });

    if (role === "Treasurer") {
      await Member.updateMany(
        { group: member.group, role: "Treasurer" },
        { role: "Member" }
      );
    }

    member.role = role;
    await member.save();

    try {
      await sendRoleAssignedEmail({
        toEmail: member.contact,
        toName: member.name,
        groupName: group.name,
        role,
      });
    } catch (emailErr) {
      console.error("Role email failed:", emailErr.message);
    }

    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/members/:id (general update)
router.patch("/members/:id", protect, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).populate("group");
    if (!member || member.group.owner.toString() !== req.userId)
      return res.status(404).json({ error: "Member not found" });

    Object.assign(member, req.body);
    await member.save();
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/members/:id
router.delete("/members/:id", protect, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).populate("group");
    if (!member || member.group.owner.toString() !== req.userId)
      return res.status(404).json({ error: "Member not found" });

    await member.deleteOne();
    res.json({ message: "Member removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/members/reorder
router.put("/members/reorder", protect, async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: "order must be an array" });

    await Promise.all(order.map(({ id, slot }) => Member.findByIdAndUpdate(id, { slot })));
    res.json({ message: "Order saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Meeting routes ────────────────────────────────────────────────────────────

// GET /api/meetings?groupId=xxx
router.get("/meetings", protect, async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) return res.status(400).json({ error: "groupId required" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isOwner = group.owner.toString() === req.userId;
    if (!isOwner) {
      const currentUser = await User.findById(req.userId).select("email");
      const isMember = await Member.findOne({
        group: groupId,
        status: "active",
        $or: [
          { userId: req.userId },
          { contact: currentUser?.email?.toLowerCase() },
        ],
      });
      if (!isMember) return res.status(403).json({ error: "Access denied" });
    }

    const meetings = await Meeting.find({ group: groupId }).sort("date");
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/meetings/:id
router.get("/meetings/:id", protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/meetings
router.post("/meetings", protect, async (req, res) => {
  try {
    const { date, time, venue, link, notes, agenda, groupId } = req.body;
    if (!date || !venue?.trim()) return res.status(400).json({ error: "Date and venue are required" });
    if (!groupId) return res.status(400).json({ error: "groupId is required" });

    const { group, error, status } = await getGroupIfAuthorised(groupId, req.userId, ["Treasurer"]);
    if (!group) return res.status(status).json({ error });

    const isPast = new Date(date) < new Date();
    const meeting = await Meeting.create({
      group: groupId,
      date, time,
      venue: venue.trim(),
      link: link?.trim(),
      agenda: agenda?.trim(),
      notes: notes?.trim(),
      status: isPast ? "completed" : "upcoming",
    });

    const members = await Member.find({ group: groupId, status: "active" });
    await Promise.allSettled(members.map((m) =>
      sendMeetingNotification({
        toEmail: m.contact,
        toName: m.name,
        groupName: group.name,
        meetingDate: formatDate(date),
        meetingTime: time,
        venue,
        link,
        agenda,
      }).catch((err) => console.error(`Notify failed for ${m.contact}:`, err.message))
    ));

    res.status(201).json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/meetings/:id
router.patch("/meetings/:id", protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate("group");
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const groupId = meeting.group._id.toString();
    const { group, error, status } = await getGroupIfAuthorised(groupId, req.userId, ["Treasurer"]);
    if (!group) return res.status(status).json({ error });

    const wasMinutesEmpty = !meeting.minutes?.summary;
    Object.assign(meeting, req.body);
    await meeting.save();

    if (wasMinutesEmpty && req.body.minutes) {
      const members = await Member.find({ group: groupId, status: "active" });
      await Promise.allSettled(members.map((m) =>
        sendMeetingMinutes({
          toEmail: m.contact,
          toName: m.name,
          groupName: meeting.group.name,
          meetingDate: formatDate(meeting.date),
          minutes: req.body.minutes,
        }).catch((err) => console.error(`Minutes email failed for ${m.contact}:`, err.message))
      ));
      meeting.minutesSentAt = new Date();
      await meeting.save();
    }

    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/meetings/:id
router.delete("/meetings/:id", protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate("group");
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const groupId = meeting.group._id.toString();
    const { group, error, status } = await getGroupIfAuthorised(groupId, req.userId, ["Treasurer"]);
    if (!group) return res.status(status).json({ error });

    await meeting.deleteOne();
    res.json({ message: "Meeting deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Flag missing contributions (bulk email) ───────────────────────────────────
router.post("/flag-missing", protect, async (req, res) => {
  try {
    const { groupId, month } = req.body;
    if (!groupId || !month) return res.status(400).json({ error: "groupId and month are required" });

    const { group, error, status } = await getGroupIfAuthorised(groupId, req.userId, ["Treasurer"]);
    if (!group) return res.status(status).json({ error });

    const members = await Member.find({ group: groupId, status: "active" });
    const unpaid = members.filter((m) => {
      const contribution = m.contributions?.find((c) => c.month === month);
      return !contribution || contribution.status !== "paid";
    });

    if (unpaid.length === 0) return res.json({ message: "All members have paid this month", flagged: 0 });

    const results = await Promise.allSettled(unpaid.map((m) =>
      sendMissingContributionEmail({
        toEmail: m.contact,
        toName: m.name,
        groupName: group.name,
        month,
        amount: group.amount,
      })
    ));

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    res.json({
      message: `Flagged ${unpaid.length} members — ${sent} emails sent${failed > 0 ? `, ${failed} failed` : ""}`,
      flagged: unpaid.length,
      members: unpaid.map((m) => ({ name: m.name, contact: m.contact })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// FIXED PAYOUT ROUTES (using Member collection)
// ======================================

// GET FIFO PAYOUT SCHEDULE
router.get("/groups/:groupId/payout-schedule", protect, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const members = await Member.find({ group: groupId, status: "active" }).sort("createdAt");
    const currentMonth = new Date().toISOString().slice(0, 7);

    const payoutSchedule = members.map((member, index) => {
      const contribution = member.contributions?.find((c) => c.month === currentMonth);
      return {
        position: index + 1,
        memberId: member._id,
        name: member.name,
        email: member.contact,
        role: member.role,
        joinedAt: member.createdAt,
        contributionStatus: contribution ? contribution.status : "missed",
        isNextPayout: index === group.nextPayoutIndex,
      };
    });

    res.json({ success: true, totalMembers: members.length, payoutSchedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TREASURER FLAGS PAYMENT (for current month) + creates in-app notification
router.post("/groups/:groupId/flag-payment", protect, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId, status } = req.body; // status = "paid" or "missed"

    if (!["paid", "missed"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'paid' or 'missed'" });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const requesterMember = await Member.findOne({ group: groupId, userId: req.userId, status: "active" });
    if (!requesterMember || !["Admin", "Treasurer"].includes(requesterMember.role)) {
      return res.status(403).json({ error: "Only treasurer or admin can flag payments" });
    }

    const member = await Member.findOne({ _id: memberId, group: groupId });
    if (!member) return res.status(404).json({ error: "Member not found" });

    const currentMonth = new Date().toISOString().slice(0, 7);
    const dueDate = new Date();
    dueDate.setDate(5);

    let contribution = member.contributions?.find((c) => c.month === currentMonth);
    if (!contribution) {
      member.contributions.push({
        month: currentMonth,
        amount: group.amount,
        dueDate,
        status,
        paidAt: status === "paid" ? new Date() : null,
        reminderSent: false,
      });
    } else {
      contribution.status = status;
      contribution.paidAt = status === "paid" ? new Date() : null;
    }
    await member.save();

    if (status === 'missed') {
      let userId = member.userId;
      if (!userId) {
        const user = await User.findOne({ email: member.contact });
        if (user) userId = user._id;
      }
      if (userId) {
        await Notification.create({
          userId,
          type: 'missed_payment',
          title: 'Missed Contribution',
          message: `Your contribution of R${group.amount} for ${currentMonth} was marked as missed. Please pay as soon as possible.`,
          relatedId: groupId,
          isRead: false,
        });
      }
    }

    res.json({ success: true, message: `Payment marked as ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADVANCE FIFO PAYOUT
router.post("/groups/:groupId/advance-payout", protect, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const requesterMember = await Member.findOne({ group: groupId, userId: req.userId, status: "active" });
    if (!requesterMember || !["Admin", "Treasurer"].includes(requesterMember.role)) {
      return res.status(403).json({ error: "Only treasurer or admin can advance payout" });
    }

    const members = await Member.find({ group: groupId, status: "active" }).sort("createdAt");
    if (members.length === 0) return res.status(400).json({ error: "No active members" });

    const currentMonth = new Date().toISOString().slice(0, 7);
    let currentIndex = group.nextPayoutIndex || 0;
    if (currentIndex >= members.length) currentIndex = 0;

    const currentMember = members[currentIndex];
    const contribution = currentMember.contributions?.find((c) => c.month === currentMonth);

    if (!contribution || contribution.status !== "paid") {
      group.nextPayoutIndex = (currentIndex + 1) % members.length;
      await group.save();
      return res.json({ success: true, skipped: true, message: `${currentMember.name} skipped (missed payment)` });
    }

    group.nextPayoutIndex = (currentIndex + 1) % members.length;
    await group.save();

    res.json({ success: true, paidTo: currentMember.name, message: "Payout advanced" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ======================================
// COMPLIANCE REPORT (Treasurer/Admin)
// ======================================
router.get("/groups/:groupId/compliance-report", protect, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const requesterMember = await Member.findOne({ group: groupId, userId: req.userId, status: "active" });
    if (!requesterMember || !["Admin", "Treasurer"].includes(requesterMember.role)) {
      return res.status(403).json({ error: "Only treasurer or admin can view compliance report" });
    }

    const members = await Member.find({ group: groupId, status: "active" }).sort("slot");
    
    const monthsSet = new Set();
    members.forEach(m => {
      m.contributions.forEach(c => monthsSet.add(c.month));
    });
    let months = Array.from(monthsSet).sort();
    if (months.length === 0) months = [new Date().toISOString().slice(0, 7)];

    const report = members.map(member => {
      const contribMap = {};
      member.contributions.forEach(c => { contribMap[c.month] = c.status; });
      const monthStatuses = months.map(month => ({
        month,
        status: contribMap[month] || "missed"
      }));
      const totalExpected = months.length;
      const totalPaid = monthStatuses.filter(m => m.status === "paid").length;
      const missedCount = monthStatuses.filter(m => m.status === "missed").length;
      const compliancePercentage = totalExpected ? Math.round((totalPaid / totalExpected) * 100) : 0;

      return {
        memberId: member._id,
        name: member.name,
        email: member.contact,
        role: member.role,
        joinedAt: member.createdAt,
        monthStatuses,
        totalExpected,
        totalPaid,
        missedCount,
        compliancePercentage
      };
    });

    res.json({ groupName: group.name, months, report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;