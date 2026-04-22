// Handles PayFast contribution and payout routes

const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const router = express.Router();

// PayFast configuration
const PAYFAST_SANDBOX = process.env.PAYFAST_SANDBOX !== "false";
const PAYFAST_HOST = PAYFAST_SANDBOX
  ? "https://sandbox.payfast.co.za"
  : "https://www.payfast.co.za";

const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || "10000100";
const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || "46f0cd694581a";
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE || "";
const BACKEND_URL = process.env.AZURE_URL || "http://localhost:3001";
const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Verifies JWT token
function protect(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Gets Group model only after it exists
function getGroup() {
  return mongoose.models.Group;
}

// Gets Member model only after it exists
function getMember() {
  return mongoose.models.Member;
}

// Contribution model
const contributionSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    amount: { type: Number, required: true },
    month: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    pfPaymentId: { type: String },
    reference: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

const Contribution =
  mongoose.models.Contribution ||
  mongoose.model("Contribution", contributionSchema);

// Disbursement model
const disbursementSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    amount: { type: Number, required: true },
    month: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    reference: { type: String },
    note: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

const Disbursement =
  mongoose.models.Disbursement ||
  mongoose.model("Disbursement", disbursementSchema);

// Creates PayFast signature from payment data
function generateSignature(data, passphrase = "") {
  const filtered = Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        value !== "" &&
        value !== null &&
        value !== undefined &&
        key !== "signature"
    )
  );

  const sorted = Object.keys(filtered)
    .sort()
    .reduce((acc, key) => {
      acc[key] = filtered[key];
      return acc;
    }, {});

  let str = Object.entries(sorted)
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(String(value).trim()).replace(/%20/g, "+")}`
    )
    .join("&");

  if (passphrase && passphrase.trim() !== "") {
    str += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
  }

  console.log("Signature string:", str);

  return crypto.createHash("md5").update(str).digest("hex");
}

// Returns current month as YYYY-MM
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Start a contribution payment
router.post("/contribute", protect, async (req, res) => {
  try {
    const { groupId, memberId } = req.body;

    if (!groupId || !memberId) {
      return res.status(400).json({ error: "groupId and memberId required" });
    }

    const Group = getGroup();
    const Member = getMember();

    const group = await Group.findOne({ _id: groupId, owner: req.userId });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!group.amount) {
      return res.status(400).json({ error: "Group contribution amount not set" });
    }

    const member = await Member.findOne({ _id: memberId, group: groupId });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const month = currentMonth();

    const existing = await Contribution.findOne({
      group: groupId,
      member: memberId,
      month,
      status: "paid",
    });

    if (existing) {
      return res.status(409).json({
        error: `${member.name} already paid for this month`,
      });
    }

    const reference = `STK-${groupId
      .toString()
      .slice(-4)
      .toUpperCase()}-${memberId
      .toString()
      .slice(-4)
      .toUpperCase()}-${Date.now()}`;

    const contribution = await Contribution.create({
      group: groupId,
      member: memberId,
      amount: group.amount,
      month,
      status: "pending",
      reference,
    });

    const paymentData = {
      merchant_id: MERCHANT_ID,
      merchant_key: MERCHANT_KEY,
      return_url: `${FRONTEND_URL}/group?payment=success&ref=${reference}`,
      cancel_url: `${FRONTEND_URL}/group?payment=cancelled&ref=${reference}`,
      notify_url: `${BACKEND_URL}/api/payfast/itn`,
      name_first: member.name.split(" ")[0],
      name_last: member.name.split(" ").slice(1).join(" ") || "Member",
      email_address: member.contact.includes("@")
        ? member.contact
        : `member+${member._id}@stokvel.app`,
      m_payment_id: reference,
      amount: Number(group.amount).toFixed(2),
      item_name: "Stokvel Contribution",
    };

    paymentData.signature = generateSignature(paymentData, PASSPHRASE);

    const sortedParams = Object.keys(paymentData)
      .sort()
      .reduce((acc, key) => {
        acc[key] = paymentData[key];
        return acc;
      }, {});

    const params = new URLSearchParams(sortedParams).toString();
    const paymentUrl = `${PAYFAST_HOST}/eng/process?${params}`;

    console.log("PayFast URL:", paymentUrl);

    res.json({
      paymentUrl,
      reference,
      contributionId: contribution._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PayFast ITN callback
router.post("/itn", express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const data = req.body;

    const received = data.signature;
    const toVerify = { ...data };
    delete toVerify.signature;

    const expected = generateSignature(toVerify, PASSPHRASE);

    if (received !== expected) {
      console.error(
        "PayFast ITN: invalid signature. Expected:",
        expected,
        "Got:",
        received
      );
      return res.status(400).send("Invalid signature");
    }

    if (data.payment_status !== "COMPLETE") {
      await Contribution.findOneAndUpdate(
        { reference: data.m_payment_id },
        { status: "failed" }
      );

      return res.status(200).send("OK");
    }

    const contribution = await Contribution.findOneAndUpdate(
      { reference: data.m_payment_id },
      {
        status: "paid",
        pfPaymentId: data.pf_payment_id,
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!contribution) {
      console.error("PayFast ITN: contribution not found for ref", data.m_payment_id);
      return res.status(404).send("Contribution not found");
    }

    console.log(`Contribution paid: ${data.m_payment_id} — R${data.amount_gross}`);
    res.status(200).send("OK");
  } catch (err) {
    console.error("PayFast ITN error:", err);
    res.status(500).send("Server error");
  }
});

// Get contributions for a group
router.get("/contributions", protect, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ error: "groupId required" });
    }

    const group = await getGroup().findOne({ _id: groupId, owner: req.userId });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const contributions = await Contribution.find({ group: groupId })
      .populate("member", "name initials")
      .sort("-paidAt");

    res.json(contributions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create disbursement record
router.post("/disburse", protect, async (req, res) => {
  try {
    const { groupId, memberId, note } = req.body;

    if (!groupId || !memberId) {
      return res.status(400).json({ error: "groupId and memberId required" });
    }

    const Group = getGroup();
    const Member = getMember();

    const group = await Group.findOne({ _id: groupId, owner: req.userId });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!group.amount) {
      return res.status(400).json({ error: "Group amount not set" });
    }

    const member = await Member.findOne({ _id: memberId, group: groupId });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const month = currentMonth();

    const existing = await Disbursement.findOne({
      group: groupId,
      member: memberId,
      month,
    });

    if (existing) {
      return res.status(409).json({
        error: `Payout already initiated for ${member.name} this month`,
      });
    }

    const contributions = await Contribution.find({
      group: groupId,
      month,
      status: "paid",
    });

    const totalCollected = contributions.reduce(
      (sum, contribution) => sum + contribution.amount,
      0
    );

    const memberCount = await Member.countDocuments({ group: groupId });
    const payoutAmount = totalCollected || group.amount * memberCount;

    const reference = `PAYOUT-${groupId.toString().slice(-4).toUpperCase()}-${Date.now()}`;

    const disbursement = await Disbursement.create({
      group: groupId,
      member: memberId,
      amount: payoutAmount,
      month,
      status: "pending",
      reference,
      note: note || "",
    });

    await disbursement.populate("member", "name initials");

    res.status(201).json({
      disbursement,
      message: `Payout of R${payoutAmount} to ${member.name} recorded as pending.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark disbursement as paid
router.patch("/disburse/:id", protect, async (req, res) => {
  try {
    const disbursement = await Disbursement.findById(req.params.id).populate("group");

    if (!disbursement || disbursement.group.owner.toString() !== req.userId) {
      return res.status(404).json({ error: "Disbursement not found" });
    }

    disbursement.status = "paid";
    disbursement.paidAt = new Date();

    await disbursement.save();

    res.json(disbursement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get disbursements for a group
router.get("/disbursements", protect, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ error: "groupId required" });
    }

    const group = await getGroup().findOne({ _id: groupId, owner: req.userId });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const disbursements = await Disbursement.find({ group: groupId })
      .populate("member", "name initials")
      .sort("-createdAt");

    res.json(disbursements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;