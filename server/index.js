// Entry point: connects to database and starts server
require('dotenv').config({ path: __dirname + '/.env' }); 
const mongoose = require("mongoose");
const app = require("./app");
const groupRoutes = require("./routes/groupRoutes");

app.use("/api", groupRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Database connected successfully");
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log("Server running on port " + PORT);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });