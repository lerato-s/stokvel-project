// server.js
// Entry point

require("dotenv").config()

const mongoose = require("mongoose")

const app = require("./app")

// DATABASE CONNECTION

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Database connected successfully")

    const PORT = process.env.PORT || 3001

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)

      // Start scheduled services
      require("./services/rateService")
    })
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message)

    process.exit(1)
  })