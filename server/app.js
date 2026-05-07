// Creates and configures the Express app

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import route modules
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const groupRoutes = require("./routes/groupRoutes");
const payfastRoutes = require("./routes/payfastRoutes");



const app = express();

// Parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure CORS for frontend communication
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Simple health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Mount route modules under API paths
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", groupRoutes);
app.use("/api/payfast", payfastRoutes);


module.exports = app;