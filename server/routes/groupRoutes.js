const express = require("express")

const router = express.Router()

// Middleware
const protect = require("../middleware/authMiddleware")

// Controllers
const {
  getGroups,
  createGroup,
  addMember,
  makeAdmin,
  makeTreasurer,
  removeMember,
} = require("../controllers/groupController")

// Get all groups for logged-in user
router.get("/groups", protect, getGroups)

// Create group
router.post("/groups", protect, createGroup)

// Add member
router.post("/groups/add-member", protect, addMember)

// Promote member to admin
router.put("/groups/make-admin", protect, makeAdmin)

// Promote member to treasurer
router.put("/groups/make-treasurer", protect, makeTreasurer)

// Remove member
router.delete("/groups/remove-member", protect, removeMember)

module.exports = router