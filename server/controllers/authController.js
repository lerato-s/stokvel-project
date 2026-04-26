
const UserModel = require('../models/users');

/**
 * Sync user from Auth0 to database
 */
const syncUser = async (req, res) => {
  try {

    if (!req.auth || !req.auth.payload) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    const payload = req.auth.payload;

    // Auth0 unique ID
    const auth0Id = payload.sub;

    if (!auth0Id) {
      return res.status(400).json({ error: "Missing Auth0 user ID" });
    }

    // Email may be missing for some providers
    const email = payload.email || null;

    // Determine user name
    let name = payload.name;

    if (!name && email) {
      name = email.split('@')[0];
    }

    if (!name) {
      name = auth0Id.substring(0, 10);
    }

    const picture = payload.picture || '';

    // Detect provider
    let provider = 'auth0';

    if (auth0Id.includes('google')) provider = 'google';
    if (auth0Id.includes('microsoft') || auth0Id.includes('windowslive')) provider = 'microsoft';

    // Create or fetch user
    const user = await UserModel.findOrCreateFromAuth0(
      auth0Id,
      email,
      name,
      picture,
      provider
    );

    res.json({
      user: {
        id: user._id,
        auth0Id: user.auth0Id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        role: user.role,
        createdAt: user.createdAt
      }
    });

  } catch (error) {

    console.error("Auth0 sync error:", error);

    res.status(500).json({
      error: "User synchronization failed"
    });

  }
};


/**
 * Get currently logged-in user
 */
const getCurrentUser = async (req, res) => {

  try {

    const auth0Id = req.userId;

    if (!auth0Id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await UserModel.findOne({ auth0Id });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        auth0Id: user.auth0Id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {

    console.error("Get current user error:", error);

    res.status(500).json({
      error: "Failed to retrieve user"
    });

  }

};


/**
 * Logout endpoint
 */
const logout = (req, res) => {

  res.json({
    message: "Logged out successfully"
  });

};


module.exports = {
  syncUser,
  getCurrentUser,
  logout
};