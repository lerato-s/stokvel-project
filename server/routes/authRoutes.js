// Defines authentication API endpoints

const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

// Register endpoint
router.post("/register", registerUser);

// Login endpoint
router.post("/login", loginUser);

// Forgot password endpoint
router.post("/forgot-password", forgotPassword);

// Reset password endpoint
router.post("/reset-password", resetPassword);

module.exports = router;