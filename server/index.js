const dotenv = require("dotenv")
dotenv.config()

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")

const app = express()
app.use(express.json())
app.use(cors())



// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)

.then(() => console.log("Database connected successfully"))
.catch((err) => console.error("Database connection failed:", err))

app.listen(process.env.PORT || 5173, () => {
    console.log("Server is running on port " + (process.env.PORT || 5173))
})