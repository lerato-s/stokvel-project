console.log("AUTH SERVER STARTED - index.js loading");

const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const UserModel = require("./models/users");
const GroupModel = require("./models/group");

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });

//Auth middleware 
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "You need to log in first" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

//Register 
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await UserModel.create({
      username,
      email,
      password,
      role: "member"
    });

    const { password: _, ...safeUser } = user._doc;
    res.status(201).json(safeUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "This user already exists" });
    }

    res.status(400).json({
      error: error.message,
      details: error.errors
    });
  }
});

//Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Please fill in all required fields"
      });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: "Password is incorrect" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Successfully logged in",
      token,
      id: user._id,
      role: user.role,
      email: user.email,
      username: user.username,
      groupId: user.groupId
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Forgot password
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000;

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    return res.status(200).json({
      message: "Password reset link generated",
      link: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${email}`
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Reset password 
app.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const user = await UserModel.findOne({
      email,
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

//Get all users
app.get("/users", authenticate, async (req, res) => {
  try {
    const users = await UserModel.find({}, "username email role groupId");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Create group 
app.post("/groups", authenticate, async (req, res) => {
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

    if (
      !name || !amount || !freq || !cycle || !max ||
      !meetFreq || !meetDay || !meetWeek || !payoutMethod || !rules
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const creator = await UserModel.findById(req.userId);

    if (!creator) {
      return res.status(404).json({ error: "Creator not found" });
    }

    const group = await GroupModel.create({
      name,
      amount: Number(amount),
      freq,
      cycle,
      max: Number(max),
      meetFreq,
      meetDay,
      meetWeek,
      payoutMethod,
      rules,
      createdBy: creator._id,
      adminId: creator._id,
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

    creator.groupId = group._id;
    creator.role = "admin";
    await creator.save();

    return res.status(201).json({
      success: true,
      message: `Group "${name}" created successfully`,
      group
    });
  } catch (error) {
    console.error("CREATE GROUP ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

//Get one group
app.get("/groups/:id", authenticate, async (req, res) => {
  try {
    const group = await GroupModel.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Get my groups ─────────────────────────────────────────────────────────────
app.get("/my-groups", authenticate, async (req, res) => {
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

// Add member to group (admin only)
app.post("/groups/:groupId/members", authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email, role } = req.body;

    const group = await GroupModel.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const myMembership = group.members.find(
      (m) => String(m.userId) === String(req.userId) && m.isActive
    );

    if (!myMembership || myMembership.role !== "admin") {
      return res.status(403).json({ error: "Only the group admin can add members" });
    }

    const userToAdd = await UserModel.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ error: "No user found with that email" });
    }

    const alreadyMember = group.members.some(
      (m) => String(m.userId) === String(userToAdd._id) && m.isActive
    );

    if (alreadyMember) {
      return res.status(400).json({ error: "User is already a member" });
    }

    group.members.push({
      userId: userToAdd._id,
      username: userToAdd.username,
      email: userToAdd.email,
      role: role || "member",
      joinedAt: new Date(),
      isActive: true
    });

    await group.save();

    userToAdd.groupId = group._id;
    userToAdd.role = role || "member";
    await userToAdd.save();

    res.status(201).json({
      success: true,
      message: `${userToAdd.username} added as ${role || "member"}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update member role (admin only)
app.put("/groups/:groupId/members/:memberId/role", authenticate, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { newRole } = req.body;

    const group = await GroupModel.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const requester = group.members.find(
      (m) => String(m.userId) === String(req.userId) && m.isActive
    );

    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ error: "Only admin can change roles" });
    }

    const memberToUpdate = group.members.find(
      (m) => String(m.userId) === String(memberId) && m.isActive
    );

    if (!memberToUpdate) {
      return res.status(404).json({ error: "Member not found" });
    }

    memberToUpdate.role = newRole;

    if (newRole === "admin") {
      group.adminId = memberToUpdate.userId;
    }

    await group.save();

    await UserModel.findByIdAndUpdate(memberId, { role: newRole });

    res.json({
      success: true,
      message: `Role updated to ${newRole}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//FIFO payout line 
app.get("/groups/:groupId/fifo-line", authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await GroupModel.findById(groupId);

    if (!group) return res.status(404).json({ error: "Group not found" });

    const isMember = group.members.some(
      (m) => String(m.userId) === String(req.userId) && m.isActive
    );

    if (!isMember) {
      return res.status(403).json({ error: "You are not a member" });
    }

    const fifoLine = group.getFIFOOrder();

    const fifoLineWithPositions = fifoLine.map((member, index) => ({
      position: index + 1,
      username: member.username,
      email: member.email,
      role: member.role,
      joinedAt: member.joinedAt,
      isNextPayout: index === group.nextPayoutIndex
    }));

    res.json({
      success: true,
      fifoLine: fifoLineWithPositions,
      totalMembers: fifoLine.length,
      nextPayoutPosition: group.nextPayoutIndex + 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Advance payout
app.post("/groups/:groupId/advance-payout", authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await GroupModel.findById(groupId);

    if (!group) return res.status(404).json({ error: "Group not found" });

    const myMembership = group.members.find(
      (m) => String(m.userId) === String(req.userId) && m.isActive
    );

    if (!myMembership || !["admin", "treasurer"].includes(myMembership.role)) {
      return res.status(403).json({ error: "Only admin or treasurer can do this" });
    }

    const fifoLine = group.getFIFOOrder();

    if (group.nextPayoutIndex + 1 >= fifoLine.length) {
      group.nextPayoutIndex = 0;
      group.totalPayoutsCompleted += 1;
      await group.save();

      return res.json({
        success: true,
        message: "Cycle completed. Starting over from first member."
      });
    }

    group.nextPayoutIndex += 1;
    group.totalPayoutsCompleted += 1;
    await group.save();

    res.json({
      success: true,
      message: "Moved to next person"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Server is running on port " + (process.env.PORT || 3001));
});