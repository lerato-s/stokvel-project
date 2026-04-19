// payfastRoutes.js
// Add to index.js:
//   const payfastRoutes = require("./payfastRoutes")
//   app.use("/api/payfast", payfastRoutes)
//
// Required env vars in your .env:
//   PAYFAST_MERCHANT_ID=      (from PayFast dashboard)
//   PAYFAST_MERCHANT_KEY=     (from PayFast dashboard)
//   PAYFAST_PASSPHRASE=       (set in PayFast dashboard under Settings)
//   PAYFAST_SANDBOX=true      (set to false in production)
//   AZURE_URL=                (your deployed Azure backend URL e.g. https://your-app.azurewebsites.net)
//   CLIENT_URL=               (your frontend URL)

const express  = require("express")
const mongoose = require("mongoose")
const crypto   = require("crypto")
const jwt      = require("jsonwebtoken")
const router   = express.Router()

// ── Config ────────────────────────────────────────────────────────────────────
const PAYFAST_SANDBOX      = process.env.PAYFAST_SANDBOX !== "false"
const PAYFAST_HOST         = PAYFAST_SANDBOX
  ? "https://sandbox.payfast.co.za"
  : "https://www.payfast.co.za"
const MERCHANT_ID          = process.env.PAYFAST_MERCHANT_ID  || "10000100"  // sandbox default
const MERCHANT_KEY         = process.env.PAYFAST_MERCHANT_KEY || "46f0cd694581a"  // sandbox default
const PASSPHRASE           = process.env.PAYFAST_PASSPHRASE   || ""
const BACKEND_URL          = process.env.AZURE_URL            || "http://localhost:3001"
const FRONTEND_URL         = process.env.CLIENT_URL           || "http://localhost:5173"

// ── Auth middleware ───────────────────────────────────────────────────────────
function protect(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "No token provided" })
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET)
    req.userId = decoded.id
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}

// ── Models ────────────────────────────────────────────────────────────────────
const Group  = mongoose.model("Group")
const Member = mongoose.model("Member")

// Contribution — records every successful payment
const contributionSchema = new mongoose.Schema({
  group:       { type: mongoose.Schema.Types.ObjectId, ref: "Group",  required: true },
  member:      { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
  amount:      { type: Number, required: true },
  month:       { type: String, required: true }, // "YYYY-MM"
  status:      { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  pfPaymentId: { type: String }, // PayFast payment ID
  reference:   { type: String }, // our internal reference
  paidAt:      { type: Date },
}, { timestamps: true })

const Contribution = mongoose.models.Contribution
  || mongoose.model("Contribution", contributionSchema)

// Disbursement — treasurer paying out a member
const disbursementSchema = new mongoose.Schema({
  group:       { type: mongoose.Schema.Types.ObjectId, ref: "Group",  required: true },
  member:      { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
  amount:      { type: Number, required: true },
  month:       { type: String, required: true },
  status:      { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  reference:   { type: String },
  note:        { type: String },
  paidAt:      { type: Date },
}, { timestamps: true })

const Disbursement = mongoose.models.Disbursement
  || mongoose.model("Disbursement", disbursementSchema)

// ── PayFast signature helper ──────────────────────────────────────────────────

function generateSignature(data, passphrase = "") {
  // Remove empty values and signature field
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([k, v]) => v !== "" && v !== null && v !== undefined && k !== "signature")
  )

  // Build query string — do NOT use encodeURIComponent, use raw values
  let str = Object.entries(filtered)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim()).replace(/%20/g, "+")}`)
    .join("&")

  if (passphrase && passphrase.trim() !== "") {
    str += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`
  }

  return crypto.createHash("md5").update(str).digest("hex")
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

// ── CONTRIBUTION: initiate payment ───────────────────────────────────────────
// POST /api/payfast/contribute
// Frontend calls this → gets back a PayFast payment URL → redirects member
router.post("/contribute", protect, async (req, res) => {
  try {
    const { groupId, memberId } = req.body

    if (!groupId || !memberId)
      return res.status(400).json({ error: "groupId and memberId required" })

    const group  = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group)  return res.status(404).json({ error: "Group not found" })
    if (!group.amount) return res.status(400).json({ error: "Group contribution amount not set" })

    const member = await Member.findOne({ _id: memberId, group: groupId })
    if (!member) return res.status(404).json({ error: "Member not found" })

    const month = currentMonth()

    // Check for duplicate
    const existing = await Contribution.findOne({
      group: groupId, member: memberId, month, status: "paid"
    })
    if (existing)
      return res.status(409).json({ error: `${member.name} already paid for this month` })

    // Create a pending contribution record
    const reference = `STK-${groupId.toString().slice(-4).toUpperCase()}-${memberId.toString().slice(-4).toUpperCase()}-${Date.now()}`

    const contribution = await Contribution.create({
      group:     groupId,
      member:    memberId,
      amount:    group.amount,
      month,
      status:    "pending",
      reference,
    })

    // Build PayFast payment data
    // Build payment data
    const paymentData = {
        merchant_id:      MERCHANT_ID,
        merchant_key:     MERCHANT_KEY,  // needed for the URL but NOT for signature
        return_url:       `${FRONTEND_URL}/group?payment=success&ref=${reference}`,
        cancel_url:       `${FRONTEND_URL}/group?payment=cancelled&ref=${reference}`,
        notify_url:       `${BACKEND_URL}/api/payfast/itn`,
        name_first:       member.name.split(" ")[0],
        name_last:        member.name.split(" ").slice(1).join(" ") || "Member",
        email_address:    member.contact.includes("@") ? member.contact : `member+${member._id}@stokvel.app`,
        m_payment_id:     reference,
        amount:           Number(group.amount).toFixed(2),
        item_name:        "Stokvel Contribution",
        }

    // Generate signature WITHOUT merchant_key
    const signatureData = { ...paymentData }
    delete signatureData.merchant_key
    paymentData.signature = generateSignature(signatureData, PASSPHRASE)
    // Build PayFast redirect URL
    const params = new URLSearchParams(paymentData).toString()
    const paymentUrl = `${PAYFAST_HOST}/eng/process?${params}`

    console.log("PayFast URL:", paymentUrl)
    console.log("Payment Data:", JSON.stringify(paymentData, null, 2))

    res.json({
      paymentUrl,
      reference,
      contributionId: contribution._id,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── ITN: PayFast notifies us after payment ────────────────────────────────────
// POST /api/payfast/itn
// This MUST be a public HTTPS URL (your Azure URL)
// PayFast posts to this after every payment — we mark contribution as paid
router.post("/itn", express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const data = req.body

    // 1. Verify signature
    const received  = data.signature
    const toVerify  = { ...data }
    delete toVerify.signature

    const expected = generateSignature(toVerify, PASSPHRASE)
    if (received !== expected) {
      console.error("PayFast ITN: invalid signature")
      return res.status(400).send("Invalid signature")
    }

    // 2. Check payment status
    if (data.payment_status !== "COMPLETE") {
      // Payment failed or pending — mark as failed
      await Contribution.findOneAndUpdate(
        { reference: data.m_payment_id },
        { status: "failed" }
      )
      return res.status(200).send("OK")
    }

    // 3. Mark contribution as paid
    const contribution = await Contribution.findOneAndUpdate(
      { reference: data.m_payment_id },
      {
        status:      "paid",
        pfPaymentId: data.pf_payment_id,
        paidAt:      new Date(),
      },
      { new: true }
    )

    if (!contribution) {
      console.error("PayFast ITN: contribution not found for ref", data.m_payment_id)
      return res.status(404).send("Contribution not found")
    }

    console.log(`✅ Contribution paid: ${data.m_payment_id} — R${data.amount_gross}`)
    res.status(200).send("OK")
  } catch (err) {
    console.error("PayFast ITN error:", err)
    res.status(500).send("Server error")
  }
})

// ── GET contributions for a group ─────────────────────────────────────────────
// GET /api/payfast/contributions?groupId=xxx
router.get("/contributions", protect, async (req, res) => {
  try {
    const { groupId } = req.query
    if (!groupId) return res.status(400).json({ error: "groupId required" })

    const group = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group) return res.status(404).json({ error: "Group not found" })

    const contributions = await Contribution.find({ group: groupId })
      .populate("member", "name initials")
      .sort("-paidAt")

    res.json(contributions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── DISBURSEMENT: treasurer initiates payout ──────────────────────────────────
// POST /api/payfast/disburse
// Records a payout disbursement (PayFast Payouts API requires extra verification
// so this records it and marks as pending — treasurer confirms manually for now)
router.post("/disburse", protect, async (req, res) => {
  try {
    const { groupId, memberId, note } = req.body

    if (!groupId || !memberId)
      return res.status(400).json({ error: "groupId and memberId required" })

    const group  = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group)  return res.status(404).json({ error: "Group not found" })
    if (!group.amount) return res.status(400).json({ error: "Group amount not set" })

    const member = await Member.findOne({ _id: memberId, group: groupId })
    if (!member) return res.status(404).json({ error: "Member not found" })

    const month = currentMonth()

    // Check if already disbursed this month
    const existing = await Disbursement.findOne({ group: groupId, member: memberId, month })
    if (existing)
      return res.status(409).json({ error: `Payout already initiated for ${member.name} this month` })

    // Total collected this month
    const contributions = await Contribution.find({ group: groupId, month, status: "paid" })
    const totalCollected = contributions.reduce((sum, c) => sum + c.amount, 0)

    if (totalCollected < group.amount * (await Member.countDocuments({ group: groupId }))) {
      // Allow partial disbursement but warn
      console.warn("Disbursing before all contributions collected")
    }

    const reference = `PAYOUT-${groupId.toString().slice(-4).toUpperCase()}-${Date.now()}`

    // Calculate payout amount — total pool collected this month
    const payoutAmount = totalCollected || (group.amount * (await Member.countDocuments({ group: groupId })))

    const disbursement = await Disbursement.create({
      group:     groupId,
      member:    memberId,
      amount:    payoutAmount,
      month,
      status:    "pending",
      reference,
      note:      note || "",
    })

    await disbursement.populate("member", "name initials")

    res.status(201).json({
      disbursement,
      message: `Payout of R${payoutAmount} to ${member.name} recorded as pending. Complete via PayFast Payouts dashboard or bank transfer.`,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/payfast/disburse/:id — mark disbursement as paid
router.patch("/disburse/:id", protect, async (req, res) => {
  try {
    const disbursement = await Disbursement.findById(req.params.id).populate("group")
    if (!disbursement || disbursement.group.owner.toString() !== req.userId)
      return res.status(404).json({ error: "Disbursement not found" })

    disbursement.status = "paid"
    disbursement.paidAt = new Date()
    await disbursement.save()
    res.json(disbursement)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/payfast/disbursements?groupId=xxx
router.get("/disbursements", protect, async (req, res) => {
  try {
    const { groupId } = req.query
    if (!groupId) return res.status(400).json({ error: "groupId required" })

    const group = await Group.findOne({ _id: groupId, owner: req.userId })
    if (!group) return res.status(404).json({ error: "Group not found" })

    const disbursements = await Disbursement.find({ group: groupId })
      .populate("member", "name initials")
      .sort("-createdAt")

    res.json(disbursements)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router