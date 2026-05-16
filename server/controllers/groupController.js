// controllers/groupController.js

const Group = require("../models/group")
const User = require("../models/users")
const crypto = require("crypto")

// CREATE GROUP

const createGroup = async (req, res) => {
  try {

    const {
      name,
      amount,
      freq,
      cycle,
      max,
      meetFreq,
      meetDay,
      payoutMethod,
      rules,
    } = req.body

    const user =
      await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      })
    }

    const group =
      await Group.create({

        name,
        amount,
        freq,
        cycle,
        max,
        meetFreq,
        meetDay,
        payoutMethod,
        rules,

        createdBy: req.userId,
        adminId: req.userId,

        members: [
          {
            userId: req.userId,
            username: user.username,
            email: user.email,
            role: "admin",
            isActive: true,
          },
        ],
      })

    res.status(201).json(group)

  } catch (error) {

    res.status(500).json({
      error: error.message,
    })
  }
}

// GET USER GROUPS

const getGroups = async (req, res) => {
  try {

    const groups =
      await Group.find({
        $or: [
          { createdBy: req.userId },
          { "members.userId": req.userId },
        ],
      })

    res.json(groups)

  } catch (error) {

    res.status(500).json({
      error: error.message,
    })
  }
}

// INVITE MEMBER

const inviteMember = async (req, res) => {
  try {

    const {
      groupId,
      email,
    } = req.body

    const group =
      await Group.findById(groupId)

    if (!group) {
      return res.status(404).json({
        error: "Group not found",
      })
    }

    const existingMember =
      group.members.find(
        (m) => m.email === email
      )

    if (existingMember) {
      return res.status(400).json({
        error: "Member already invited",
      })
    }

    // Generate invite token
    const inviteToken =
      crypto.randomBytes(32).toString("hex")

    // Expiry = 48 hours
    const inviteExpiry =
      new Date(
        Date.now() +
        48 * 60 * 60 * 1000
      )

    group.members.push({
      username: "Pending",
      email,
      role: "member",
      isActive: false,
      inviteToken,
      inviteExpiry,
    })

    await group.save()

    res.json({
      message: "Invitation sent",
      inviteToken,
    })

  } catch (error) {

    res.status(500).json({
      error: error.message,
    })
  }
}

// ACCEPT INVITE

const acceptInvite = async (req, res) => {
  try {

    const { token } =
      req.params

    const group =
      await Group.findOne({
        "members.inviteToken": token,
      })

    if (!group) {
      return res.status(404).json({
        error: "Invalid invite",
      })
    }

    const member =
      group.members.find(
        (m) =>
          m.inviteToken === token
      )

    if (!member) {
      return res.status(404).json({
        error: "Invite not found",
      })
    }

    // Check expiry
    if (
      member.inviteExpiry <
      new Date()
    ) {
      return res.status(400).json({
        error: "Invite expired",
      })
    }

    const user =
      await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      })
    }

    // Activate member
    member.userId = req.userId
    member.username = user.username
    member.email = user.email
    member.isActive = true

    // Remove invite token
    member.inviteToken = undefined
    member.inviteExpiry = undefined

    await group.save()

    res.json({
      message:
        "Successfully joined group",
      group,
    })

  } catch (error) {

    res.status(500).json({
      error: error.message,
    })
  }
}

// GET FIFO PAYOUT SCHEDULE

const getPayoutSchedule =
  async (req, res) => {

    try {

      const { groupId } =
        req.params

      const group =
        await Group.findById(groupId)

      if (!group) {
        return res.status(404).json({
          error: "Group not found",
        })
      }

      const payoutOrder =
        group.getFIFOOrder()

      res.json({
        totalMembers:
          payoutOrder.length,

        payoutOrder,

        nextPayoutMember:
          payoutOrder[
            group.nextPayoutIndex
          ],
      })

    } catch (error) {

      res.status(500).json({
        error: error.message,
      })
    }
  }

// ADVANCE PAYOUT

const advancePayout =
  async (req, res) => {

    try {

      const { groupId } =
        req.params

      const group =
        await Group.findById(groupId)

      if (!group) {
        return res.status(404).json({
          error: "Group not found",
        })
      }

      const members =
        group.getFIFOOrder()

      if (members.length === 0) {
        return res.status(400).json({
          error: "No active members",
        })
      }

      // Move to next member
      group.nextPayoutIndex =
        (group.nextPayoutIndex + 1) %
        members.length

      group.totalPayoutsCompleted += 1

      await group.save()

      res.json({
        message:
          "Payout advanced",

        nextMember:
          members[
            group.nextPayoutIndex
          ],
      })

    } catch (error) {

      res.status(500).json({
        error: error.message,
      })
    }
  }


  // FLAG PAYMENT (missed or confirmed)

const flagPayment = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId, status } = req.body; // status: 'missed' | 'confirmed'

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const member = group.members.id(memberId) 
      || group.members.find(m => m._id.toString() === memberId);

    if (!member) return res.status(404).json({ error: "Member not found" });

    // If flagging as missed and this member is currently "next up" in FIFO,
    // skip them by advancing the payout index
    if (status === 'missed' && group.payoutMethod === 'Fixed Order (Roster)') {
      const fifoOrder = group.getFIFOOrder();
      const currentNextId = fifoOrder[group.nextPayoutIndex]?._id?.toString();
      if (currentNextId === memberId) {
        group.nextPayoutIndex = (group.nextPayoutIndex + 1) % fifoOrder.length;
      }
    }

    // Optionally store the flag on the member subdoc if your schema supports it
    // member.paymentStatus = status;

    await group.save();

    res.json({ message: `Payment flagged as ${status} for member`, memberId, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// EXPORTS

module.exports = {
  createGroup,
  getGroups,
  inviteMember,
  acceptInvite,
  getPayoutSchedule,
  advancePayout,
  flagPayment,
}