const express = require('express');
const router = express.Router();
const { authenticate, attachUser } = require('../middleware/authMiddleware');
const { getAllUsers, getUserById, getMyProfile } = require('../controllers/userController');

router.get('/', authenticate, attachUser, getAllUsers);
router.get('/me', authenticate, attachUser, getMyProfile);
router.get('/:userId', authenticate, attachUser, getUserById);

module.exports = router;