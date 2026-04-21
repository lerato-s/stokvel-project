console.log("AUTH SERVER STARTED - index.js loading")

const dotenv = require("dotenv")
dotenv.config()
console.log("CLIENT_URL is:", process.env.CLIENT_URL)

const express  = require("express")
const mongoose = require("mongoose")
const cors     = require("cors")
const jwt      = require("jsonwebtoken")
const crypto   = require("crypto")

const UserModel = require("./models/users")

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true,
}))

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => {
    console.error("Database connection failed:", err)
    process.exit(1)
  })

// ── Routes — groupRoutes MUST load before payfastRoutes ──────────────────────
const groupRoutes   = require("./groupRoutes")
const payfastRoutes = require("./payfastRoutes")

app.use("/api", groupRoutes)
app.use("/api/payfast", payfastRoutes)

// ── Auth middleware ───────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]
  if (!token) return res.status(401).json({ error: "You need to log in first" })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId   = decoded.id
    req.userRole = decoded.role
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}

// ── Register ──────────────────────────────────────────────────────────────────
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password)
      return res.status(400).json({ error: "All fields are required" })

    const user = await UserModel.create({ username, email, password, role: "member" })
    const { password: _, ...safeUser } = user._doc
    res.status(201).json(safeUser)
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ error: "This user already exists" })
    res.status(400).json({ error: error.message, details: error.errors })
  }
})

// ── Login ─────────────────────────────────────────────────────────────────────
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: "Please fill in all required fields" })

    const user = await UserModel.findOne({ email })
    if (!user) return res.status(401).json({ error: "User not found" })

    const isMatch = await user.matchPassword(password)
    if (!isMatch) return res.status(401).json({ error: "Password is incorrect" })

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.status(200).json({
      message:  "Successfully logged in",
      token,
      id:       user._id,
      role:     user.role,
      email:    user.email,
      username: user.username,
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// ── Forgot password ───────────────────────────────────────────────────────────
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: "Email is required" })

    const user = await UserModel.findOne({ email })
    if (!user) return res.status(404).json({ error: "No account found with this email" })

    const resetToken       = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = Date.now() + 3600000

    user.resetToken       = resetToken
    user.resetTokenExpiry = resetTokenExpiry
    await user.save()

    res.status(200).json({
      message: "Password reset link generated",
      link: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${email}`,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ── Reset password ────────────────────────────────────────────────────────────
app.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body
    if (!email || !token || !newPassword)
      return res.status(400).json({ error: "All fields are required" })
    if (newPassword.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" })

    const user = await UserModel.findOne({
      email,
      resetToken:       token,
      resetTokenExpiry: { $gt: Date.now() },
    })
    if (!user) return res.status(400).json({ error: "Invalid or expired token" })

    user.password         = newPassword
    user.resetToken       = undefined
    user.resetTokenExpiry = undefined
    await user.save()

    res.json({ message: "Password reset successful" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ── Get all users ─────────────────────────────────────────────────────────────
app.get("/users", authenticate, async (req, res) => {
  try {
    const users = await UserModel.find({}, "username email role")
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})



// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok" }))

// Create group
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

    const numericAmount = Number(amount);
    const numericMax = Number(max);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a valid number greater than 0" });
    }

    if (isNaN(numericMax) || numericMax < 2) {
      return res.status(400).json({ error: "Max members must be at least 2" });
    }

    const creator = await UserModel.findById(req.userId);

    if (!creator) {
      return res.status(404).json({ error: "Creator not found" });
    }

    const group = await GroupModel.create({
      name,
      amount: numericAmount,
      freq,
      cycle,
      max: numericMax,
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

// Get one group
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
// ── Start server ──────────────────────────────────────────────────────────────
app.listen(process.env.PORT || 3001, () => {
  console.log("Server is running on port " + (process.env.PORT || 3001))
  console.log(" All routes loaded!")
  console.log(" Available endpoints:")
  console.log("   POST   /register")
  console.log("   POST   /login")
  console.log("   POST   /forgot-password")
  console.log("   POST   /reset-password")
  console.log("   GET    /users")
  console.log("   GET    /api/health")
  console.log("   ---  stokvel routes ---")
  console.log("   GET    /api/groups")
  console.log("   POST   /api/group")
  console.log("   GET    /api/members")
  console.log("   POST   /api/members")
  console.log("   GET    /api/meetings")
  console.log("   POST   /api/meetings")
  console.log("   POST   /api/flag-missing")
  console.log("   POST   /api/payfast/contribute")
  console.log("   POST   /api/payfast/itn")
  console.log("   GET    /api/payfast/contributions")
  console.log("   POST   /api/payfast/disburse")
  console.log("   GET    /api/payfast/disbursements")
})