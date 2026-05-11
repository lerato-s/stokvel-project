// Defines user-related endpoints

const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const { getAllUsers } = require("../controllers/userController");

// Protected route to get users
router.get("/", authenticate, getAllUsers);

module.exports = router;