const Group = require("../models/group");
const User = require("../models/users");

// Get all groups for logged-in user
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      members: {
        $elemMatch: {
          userId: req.userId,
          isActive: true,
        },
      },
    }).sort("-createdAt");

    res.json(groups);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Create a new group
const createGroup = async (req, res) => {
  try {
    const {
      name,
      amount,
      freq,
      cycle,
      max,
      payoutMethod,
      rules,
    } = req.body;

    // Find logged-in user
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Create group
    const group = await Group.create({
      name,
      amount,
      freq,
      cycle,
      max,
      payoutMethod,
      rules,

      // Store creator
      createdBy: user._id,

      // Main admin
      adminId: user._id,

      // Creator automatically becomes member + admin
      members: [
        {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: "admin",
        },
      ],
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Add member to group
const addMember = async (req, res) => {
  try {
    const { groupId, userId } = req.body;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    // Check if requester is admin
    const admin = group.members.find(
      (member) =>
        member.userId.toString() === req.userId &&
        member.role === "admin"
    );

    if (!admin) {
      return res.status(403).json({
        message: "Only admins can add members",
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check if already exists
    const existingMember = group.members.find(
      (member) => member.userId.toString() === userId
    );

    if (existingMember) {
      return res.status(400).json({
        message: "User already in group",
      });
    }

    // Check group size
    if (group.members.length >= group.max) {
      return res.status(400).json({
        message: "Group is full",
      });
    }

    // Add member
    group.members.push({
      userId: user._id,
      username: user.username,
      email: user.email,
      role: "member",
    });

    await group.save();

    res.status(200).json({
      message: "Member added successfully",
      group,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Promote member to admin
const makeAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.body;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    // Check if requester is admin
    const currentAdmin = group.members.find(
      (member) =>
        member.userId.toString() === req.userId &&
        member.role === "admin"
    );

    if (!currentAdmin) {
      return res.status(403).json({
        message: "Only admins can assign admin role",
      });
    }

    // Find member
    const member = group.members.find(
      (member) => member.userId.toString() === memberId
    );

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    // Promote to admin
    member.role = "admin";

    // Update main admin
    group.adminId = member.userId;

    await group.save();

    res.status(200).json({
      message: "Member promoted to admin",
      group,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Promote member to treasurer
const makeTreasurer = async (req, res) => {
  try {
    const { groupId, memberId } = req.body;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    // Check if requester is admin
    const admin = group.members.find(
      (member) =>
        member.userId.toString() === req.userId &&
        member.role === "admin"
    );

    if (!admin) {
      return res.status(403).json({
        message: "Only admins can assign treasurer role",
      });
    }

    // Remove old treasurer
    group.members.forEach((member) => {
      if (member.role === "treasurer") {
        member.role = "member";
      }
    });

    // Find selected member
    const member = group.members.find(
      (member) => member.userId.toString() === memberId
    );

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    // Assign treasurer role
    member.role = "treasurer";

    await group.save();

    res.status(200).json({
      message: "Member promoted to treasurer",
      group,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Remove member from group
const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.body;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    // Check if requester is admin
    const admin = group.members.find(
      (member) =>
        member.userId.toString() === req.userId &&
        member.role === "admin"
    );

    if (!admin) {
      return res.status(403).json({
        message: "Only admins can remove members",
      });
    }

    // Prevent self-removal
    if (memberId === req.userId) {
      return res.status(400).json({
        message: "Admin cannot remove themselves",
      });
    }

    // Remove member
    group.members = group.members.filter(
      (member) => member.userId.toString() !== memberId
    );

    await group.save();

    res.status(200).json({
      message: "Member removed successfully",
      group,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getGroups,
  createGroup,
  addMember,
  makeAdmin,
  makeTreasurer,
  removeMember,
};