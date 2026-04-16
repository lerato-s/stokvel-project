console.log("AUTH SERVER STARTED - index.js loading")

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
    console.log("DATA RECEIVED:", req.body); // 🔥 ADD THIS

    const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({
      error: "All fields are required"
    });
  }

  const user = await UserModel.create({
      username,
      email,
      password,
      role
    });

    const { password: _, ...safeUser } = user._doc;
    res.status(201).json(safeUser);

  } catch (error) {
    console.log("REGISTRATION ERROR:", error); // 🔥 ADD THIS

    if (error.code === 11000) {
      return res.status(400).json({
        error: "This user already exists"
      });
    }
     res.status(400).json({
      error: error.message,
      details: error.errors // 🔥 shows validation issues
    });
  }

});

//logging in router


app.post('/login' , async (req , res) => {

  try{
    
    const{email,password} = req.body;

    
    if(!email ||!password){

        return res.status(400).json({ error:"Please fill in all required fields"  });
    }

    const user = await UserModel.findOne({email: email})
    if (!user) {
      return res.status(401).json({
        error: "User not found"
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: "Password is incorrect"
      });
    }

    return res.status(200).json({
      message: "Successfully logged in",
      id: user._id,
      role: user.role,
      email: user.email
    });

  }catch(error){
     return  res.status(400).json({ error: error.message });
  }

});


app.listen(process.env.PORT || 3001, () => {
    console.log("Server is running on port " + (process.env.PORT || 3001))
})