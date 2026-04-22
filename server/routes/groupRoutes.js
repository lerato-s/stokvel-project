const express = require("express");
const router = express.Router();

const GroupModel = require("../models/group");
const UserModel = require("../models/users");

// middleware to check token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.id; // store user id
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}


// CREATE GROUP + ASSIGN ADMIN

router.post("/groups", authenticate, async (req, res) => {
  try {
    const {
      name,
      amount,
      freq,
      cycle,
      max,
      meetFreq,
      meetDay,
      meetWeek,
      payoutMethod,
      rules
    } = req.body;

    // validate inputs
    if (
      !name || !amount || !freq || !cycle || !max ||
      !meetFreq || !meetDay || !meetWeek || !payoutMethod || !rules
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const creator = await UserModel.findById(req.userId);

    if (!creator) {
      return res.status(404).json({ error: "User not found" });
    }

    // create group and add creator as admin member
    const group = await GroupModel.create({
      name: name.trim(),
      amount: Number(amount),
      freq,
      cycle,
      max: Number(max),
      meetFreq,
      meetDay,
      meetWeek,
      payoutMethod,
      rules,

      createdBy: creator._id, // group creator
      adminId: creator._id,   // admin = creator

      members: [
        {
          userId: creator._id,
          username: creator.username,
          email: creator.email,
          role: "admin",
          joinedAt: new Date(),
          isActive: true
        }
      ]
    });

    // optional: update user
    creator.groupId = group._id;
    creator.role = "admin";
    await creator.save();

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      group
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


// ADD MEMBER
router.post("/groups/:groupId/members", authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email, role } = req.body;

    const group = await GroupModel.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // check admin
    const me = group.members.find(
      (m) => String(m.userId) === String(req.userId) && m.isActive
    );

    if (!me || me.role !== "admin") {
      return res.status(403).json({ error: "Only admin can add members" });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // check duplicate
    const exists = group.members.some(
      (m) => String(m.userId) === String(user._id) && m.isActive
    );

    if (exists) {
      return res.status(400).json({ error: "User already in group" });
    }

    // add member
    group.members.push({
      userId: user._id,
      username: user.username,
      email: user.email,
      role: role || "member",
      joinedAt: new Date(),
      isActive: true
    });

    await group.save();

    res.status(201).json({
      success: true,
      members: group.members
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// GET MY GROUPS

router.get("/my-groups", authenticate, async (req, res) => {
  try {
    const groups = await GroupModel.find({
      "members.userId": req.userId,
      "members.isActive": true
    });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;