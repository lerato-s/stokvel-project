// Handles authentication-related logic

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const UserModel = require("../models/users.js");
const Member = require("../models/member.js");   // ✅ FIX: import Member model
const admin = require("../firebaseAdmin");

// Register new user
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await UserModel.create({
      username,
      email,
      password,
      role: "member",
    });

    // Link any existing Member records to this user
    await Member.updateMany(
      { contact: user.email.toLowerCase(), userId: { $exists: false } },
      { $set: { userId: user._id } }
    );

    const { password: _, ...safeUser } = user._doc;
    return res.status(201).json(safeUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "This user already exists" });
    }
    return res.status(400).json({ error: error.message });
  }
};

// Login user and return token
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please fill in all required fields" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Link any existing Member records to this user
    await Member.updateMany(
      { contact: user.email.toLowerCase(), userId: { $exists: false } },
      { $set: { userId: user._id } }
    );

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Password is incorrect" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Successfully logged in",
      token,
      id: user._id,
      role: user.role,
      email: user.email,
      username: user.username,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Google authentication
const AuthenticateWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { email, name, uid } = decoded;

    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({
        username: name || email.split("@")[0],
        email,
        password: uid,
        role: "member",
        firebaseUid: uid,
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Successfully authenticated with Google",
      token,
      id: user._id,
      role: user.role,
      email: user.email,
      username: user.username,
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(400).json({ error: "Invalid Google token" });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ error: "No account found with this email" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000;

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    return res.status(200).json({
      message: "Password reset link generated",
      link: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${email}`,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Reset password
const resetPassword = async (req, res) => {
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
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  AuthenticateWithGoogle,
};
