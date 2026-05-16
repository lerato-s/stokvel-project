// routes/groupRoutes.js

const express = require("express")

const router = express.Router()

// Middleware
const authenticate = require("../middleware/authMiddleware")

// Controller
const {
  createGroup,
  getGroups,
  inviteMember,
  acceptInvite,
  getPayoutSchedule,
  advancePayout,
  flagPayment,
} = require("../controllers/groupController")

// GROUP ROUTES

// Create group
router.post(
  "/",
  authenticate,
  createGroup
)

// Get all user groups
router.get(
  "/",
  authenticate,
  getGroups
)

// MEMBER ROUTES

// Invite member
router.post(
  "/invite",
  authenticate,
  inviteMember
)

// Accept invitation
router.post(
  "/accept/:token",
  authenticate,
  acceptInvite
)

// FIFO PAYOUT ROUTES

// Get payout order
router.get(
  "/:groupId/payout-schedule",
  authenticate,
  getPayoutSchedule
)

// Advance payout
router.post(
  "/:groupId/advance-payout",
  authenticate,
  advancePayout
)

// Flag a member's payment as missed or confirmed
router.post(
  "/:groupId/flag-payment",
  authenticate,
  flagPayment
);

module.exports = router