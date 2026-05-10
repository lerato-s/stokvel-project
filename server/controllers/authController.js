const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const UserModel = require("../models/users.js");
const admin = require("../firebaseAdmin");
const Member = require("../models/member.js");


// REGISTER USER
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // create user
    const user = await UserModel.create({
      username,
      email,
      password,
      role: "member",
    });

    // link any existing member records (optional sync)
    await Member.updateMany(
      { email: user.email.toLowerCase(), userId: { $exists: false } },
      { $set: { userId: user._id } }
    );

    // remove password before response
    const { password: _, ...safeUser } = user._doc;

    return res.status(201).json(safeUser);

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "This user already exists" });
    }
    return res.status(400).json({ error: error.message });
  }
};


// LOGIN USER
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Please fill in all required fields" });
    }

    // find user
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // optional sync with member records
    await Member.updateMany(
      { email: user.email.toLowerCase(), userId: { $exists: false } },
      { $set: { userId: user._id } }
    );

    // check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Password is incorrect" });
    }

    // generate token
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


// GOOGLE AUTH
const AuthenticateWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;

    // verify Firebase token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { email, name, uid } = decoded;

    // find or create user
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

    // generate JWT
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
    return res.status(400).json({ error: "Invalid Google token" });
  }
};


// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // check email
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No account found" });
    }

    // generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000;

    await user.save();

    return res.status(200).json({
      message: "Password reset link generated",
      link: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${email}`,
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


// RESET PASSWORD
const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    // validate input
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password too short" });
    }

    // find valid token user
    const user = await UserModel.findOne({
      email,
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // update password
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    return res.json({ message: "Password reset successful" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


// EXPORT FUNCTIONS
module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  AuthenticateWithGoogle,
};