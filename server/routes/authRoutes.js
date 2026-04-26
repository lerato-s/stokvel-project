const express = require('express');
const router = express.Router();
const { authenticate, attachUser } = require('../middleware/authMiddleware');
const { syncUser, getCurrentUser, logout } = require('../controllers/authController');

// Auth0 endpoints
router.post('/sync', authenticate, attachUser, syncUser);
router.get('/me', authenticate, attachUser, getCurrentUser);
router.post('/logout', logout);

// If you still want to keep email/password registration, you can add them here
// For example:
// router.post('/register', registerUser);
// router.post('/login', loginUser);
// But they are optional now.

module.exports = router;