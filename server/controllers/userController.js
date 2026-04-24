// Handles user profile operations using MongoDB native driver

const User = require('../models/users');
const GroupMembership = require('../models/member');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAllUsers(); // uses native driver
    
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get a single user by MongoDB ID
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    return res.json({
      id: user._id,
      auth0Id: user.auth0Id,
      email: user.email,
      name: user.fullName,
      avatar: user.avatarUrl,
      provider: user.provider,
      joinedAt: user.createdAt
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get current user's profile (using Auth0 ID from token)
const getMyProfile = async (req, res) => {
  try {
    const auth0Id = req.userId; // from attachUser middleware
    const user = await User.findByAuth0Id(auth0Id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found in database" });
    }
    
    // Get user's groups with roles (from GroupMembership model)
    // You'll need to implement GroupMembership model similarly
    const memberships = await GroupMembership.findByUserId(user._id);
    
    return res.json({
      id: user._id,
      email: user.email,
      name: user.fullName,
      avatar: user.avatarUrl,
      provider: user.provider,
      groups: memberships,
      createdAt: user.createdAt
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getMyProfile
};