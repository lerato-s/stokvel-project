// app.js
// Creates and configures the Express app

require("dotenv").config()

const express = require("express")
const cors = require("cors")

// Route imports
const authRoutes = require("./routes/authRoutes")
const userRoutes = require("./routes/userRoutes")
const groupRoutes = require("./routes/groupRoutes")
const payfastRoutes = require("./routes/payfastRoutes")
const rateRoutes = require("./routes/rateRoutes")

const app = express()

// MIDDLEWARE

// Parse JSON
app.use(express.json())

// Parse form data
app.use(express.urlencoded({ extended: false }))

// CORS CONFIGURATION

app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        process.env.CLIENT_URL,
        "http://localhost:5173",
        "https://stokvel-frontend-agdyfaameebwe4f7.brazilsouth-01.azurewebsites.net",
      ]

      // Allow Postman / mobile apps
      if (!origin) {
        return callback(null, true)
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    credentials: true,
  })
)

// HEALTH CHECK

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
  })
})

// ROUTES

app.use("/api/auth", authRoutes)

app.use("/api/users", userRoutes)

app.use("/api/groups", groupRoutes)

app.use("/api/payfast", payfastRoutes)

app.use("/api/rates", rateRoutes)

// EXPORT APP

module.exports = app