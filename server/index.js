const dotenv = require("dotenv")
dotenv.config()

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const UserModel = require("./models/users")

const app = express()
app.use(express.json())
app.use(cors())



// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)

.then(() => console.log("Database connected successfully"))
.catch((err) => console.error("Database connection failed:", err))

app.post('/register', async (req, res) => {
    try {
    const user = await UserModel.create(req.body)
    res.status(201).json(user)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})


app.listen(process.env.PORT || 3001, () => {
    console.log("Server is running on port " + (process.env.PORT || 3001))
})