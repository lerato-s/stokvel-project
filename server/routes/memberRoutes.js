// routes/memberRoutes.js
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const router = express.Router();

const User = require("../models/users");

function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function getMember() { return mongoose.models.Member; }
function getGroup()  { return mongoose.models.Group;  }

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// GET /api/members?groupId=xxx
router.get("/members", protect, async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) return res.status(400).json({ error: "groupId required" });

    const Group  = getGroup();
    const Member = getMember();

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
          { contact: currentUser?.email?.toLowerCase() }
        ],
      });
      if (!isMember) return res.status(403).json({ error: "Access denied" });
    }

    const members = await Member.find({ group: groupId }).sort("createdAt");
    res.json(members);
  } catch (err) {
    console.error("Get members error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members — invite a new member
router.post("/members", protect, async (req, res) => {
  try {
    const { name, contact, groupId } = req.body;
    if (!name || !contact || !groupId) {
      return res.status(400).json({ error: "name, contact, and groupId required" });
    }

    const Group  = getGroup();
    const Member = getMember();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Only owner or admin member can invite
    const isOwner = group.owner.toString() === req.userId;
    if (!isOwner) {
      const currentUser = await User.findById(req.userId).select("email");
      const adminMember = await Member.findOne({
        group: groupId,
        role: "Admin",
        status: "active",
        $or: [
          { userId: req.userId },
          { contact: currentUser?.email?.toLowerCase() }
        ],
      });
      if (!adminMember) {
        return res.status(403).json({ error: "Only admin can invite members" });
      }
    }

    // Check not already a member
    const existing = await Member.findOne({
      group: groupId,
      contact: contact.toLowerCase(),
    });
    if (existing) {
      return res.status(409).json({ error: `${contact} is already a member of this group` });
    }

    const initials = name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const member = await Member.create({
      name,
      contact: contact.toLowerCase(),
      group: groupId,
      initials,
      role: "Member",
      status: "active",
    });

    res.status(201).json(member);
  } catch (err) {
    console.error("Invite member error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/members/:id/role — change a member's role
router.patch("/members/:id/role", protect, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: "role required" });

    const validRoles = ["Admin", "Treasurer", "Member"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(", ")}` });
    }

    const Group  = getGroup();
    const Member = getMember();

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: "Member not found" });

    const group = await Group.findById(member.group);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Only owner or admin can change roles
    const isOwner = group.owner.toString() === req.userId;
    if (!isOwner) {
      const currentUser = await User.findById(req.userId).select("email");
      const adminMember = await Member.findOne({
        group: member.group,
        role: "Admin",
        status: "active",
        $or: [
          { userId: req.userId },
          { contact: currentUser?.email?.toLowerCase() }
        ],
      });
      if (!adminMember) {
        return res.status(403).json({ error: "Only admin can change roles" });
      }
    }

    member.role = role;
    await member.save();

    res.json(member);
  } catch (err) {
    console.error("Role change error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/members/reorder — save drag-drop payout order
router.put("/members/reorder", protect, async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: "order array required" });
    }

    const Member = getMember();

    await Promise.all(
      order.map(({ id, slot }) =>
        Member.findByIdAndUpdate(id, { slot })
      )
    );

    res.json({ message: "Order saved" });
  } catch (err) {
    console.error("Reorder error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:groupId/flag-payment — flag a member's payment as missed
router.post("/groups/:groupId/flag-payment", protect, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId, status } = req.body;

    if (!memberId) return res.status(400).json({ error: "memberId required" });

    const Group      = getGroup();
    const Member     = getMember();
    const Contribution = mongoose.models.Contribution;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Allow owner or treasurer
    const isOwner = group.owner.toString() === req.userId;
    if (!isOwner) {
      const currentUser = await User.findById(req.userId).select("email");
      const treasurer = await Member.findOne({
        group: groupId,
        role: { $in: ["Treasurer", "Admin"] },
        status: "active",
        $or: [
          { userId: req.userId },
          { contact: currentUser?.email?.toLowerCase() }
        ],
      });
      if (!treasurer) {
        return res.status(403).json({ error: "Only admin or treasurer can flag payments" });
      }
    }

    const member = await Member.findOne({ _id: memberId, group: groupId });
    if (!member) return res.status(404).json({ error: "Member not found" });

    const month = currentMonth();
    const flagStatus = status || "missed";

    const existing = await Contribution.findOne({
      group: groupId,
      member: memberId,
      month,
    });

    if (existing) {
      existing.status = flagStatus;
      await existing.save();
    } else {
      await Contribution.create({
        group: groupId,
        member: memberId,
        amount: group.amount,
        month,
        status: flagStatus,
        reference: `MISSED-${memberId.toString().slice(-4)}-${Date.now()}`,
      });
    }

    res.json({ message: `Payment flagged as ${flagStatus} for ${member.name}` });
  } catch (err) {
    console.error("Flag payment error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;