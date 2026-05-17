const express = require("express");
const router = express.Router();
const { getSavingsProjection } = require('../controllers/savingsController');

router.get("/", getSavingsProjection);

module.exports = router;