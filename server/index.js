console.log("AUTH SERVER STARTED - index.js loading")

const dotenv = require("dotenv")
dotenv.config()

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const UserModel = require("./models/users")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const groupRoutes = require("./groupRoutes")
const payfastRoutes = require("./payfastRoutes")

const app = express()

app.use(express.json())
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use("/api", groupRoutes)
app.use("/api/payfast", payfastRoutes)

// Connect to MongoDB
// ✅ Correct
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("Database connected successfully"))
.catch((err) => {
  console.error("Database connection failed:", err);
  process.exit(1);  // only exit if DB connection fails
});



app.post('/register', async (req, res) => {
  try {
    console.log("DATA RECEIVED:", req.body); // 🔥 ADD THIS

    const { username, email, password } = req.body;

  if (!username || !email || !password ) {
    return res.status(400).json({
      error: "All fields are required"
    });
  }
  
  const user = await UserModel.create({
      username,
      email,
      password,
      role : "member"
    });

    const { password: _, ...safeUser } = user._doc;
    res.status(201).json(safeUser);

  } catch (error) {
    console.log("REGISTRATION ERROR:", error); // 🔥 ADD THIS

    if (error.code === 11000) {
      return res.status(400).json({
        error: "This user already exists"
      });
    }
     res.status(400).json({
      error: error.message,
      details: error.errors // 🔥 shows validation issues
    });
  }

});

//logging in router


app.post('/login' , async (req , res) => {

  try{
    
    const{email,password} = req.body;

    
    if(!email ||!password){

        return res.status(400).json({ error:"Please fill in all required fields"  });
    }

    const user = await UserModel.findOne({email: email});
    if (!user) {
      return res.status(401).json({
        error: "User not found"
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: "Password is incorrect"
      });
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
      email: user.email
    });

  }catch(error){
     return  res.status(400).json({ error: error.message });
  }

});

//forgot-password in router

app.post('/forgot-password', async (req, res) => {
  
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required"
      });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: "No account found with this email"
      });
    }

    // Demo token
    //const resetToken = Math.random().toString(36).substring(2, 12);
    const resetToken = crypto.randomBytes(32).toString('hex'); // Generate a secure random token
    const resetTokenExpiry = Date.now() + 3600000; // Token expires in 1 hour

    // Save token in DB
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // In real app send email
    return res.status(200).json({
      message: "Password reset link generated",
      link: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${email}`
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }

  
});

app.post('/reset-password', async (req, res) => {
  console.log("RESET BODY:", req.body)
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters"
      });
    }

    const user = await UserModel.findOne({
      email,
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() } // Check token is not expired
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired token"
      });
    }

    user.password = newPassword;
    user.resetToken = undefined;

    await user.save();

    return res.json({
      message: "Password reset successful"
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }))

app.listen(process.env.PORT || 3001, () => {
    console.log("Server is running on port " + (process.env.PORT || 3001))
})