// Handles user-related operations

const UserModel = require("../models/users.js");

// Get all users (protected route)
const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find({}, "username email role");
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllUsers };