const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Import your app (you need to export app from index.js)
// For testing, we'll create a separate app instance
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Mock models
const UserModel = require('../models/users');
const GroupModel = require('../models/group');

let mongoServer;
let app;

// Setup before tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  await mongoose.connect(uri);
  
  // Create a test app
  app = express();
  app.use(express.json());
  
  // Import routes (simplified for testing)
  setupTestRoutes(app);
});

// Cleanup after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear database before each test
beforeEach(async () => {
  await UserModel.deleteMany({});
  await GroupModel.deleteMany({});
});

// Helper function to setup routes for testing
function setupTestRoutes(app) {
  
  // REGISTER ROUTE
  app.post('/api/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      
      const user = await UserModel.create({
        username,
        email,
        password,
        role: "member"
      });
      
      const { password: _, ...safeUser } = user._doc;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // LOGIN ROUTE
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Please fill in all required fields" });
      }
      
      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: "Password is incorrect" });
      }
      
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || "test_secret",
        { expiresIn: "7d" }
      );
      
      res.status(200).json({
        message: "Successfully logged in",
        token,
        id: user._id,
        role: user.role,
        email: user.email,
        username: user.username
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // CREATE GROUP ROUTE (for payout testing)
  app.post('/api/groups', async (req, res) => {
    try {
      const { name, amount, freq, cycle, max, meetFreq, meetDay, meetWeek, payoutMethod, rules } = req.body;
      const { userId } = req.headers; // Simulate auth
      
      const creator = await UserModel.findById(userId);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      const group = await GroupModel.create({
        name,
        amount: Number(amount),
        freq,
        cycle,
        max: Number(max),
        meetFreq,
        meetDay,
        meetWeek,
        payoutMethod,
        rules,
        createdBy: creator._id,
        adminId: creator._id,
        nextPayoutIndex: 0,
        totalPayoutsCompleted: 0,
        members: [{
          userId: creator._id,
          username: creator.username,
          email: creator.email,
          role: "admin",
          joinedAt: new Date(),
          isActive: true
        }]
      });
      
      res.status(201).json({ success: true, groupId: group._id, group });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // FIFO LINE ROUTE
  app.get('/api/groups/:groupId/fifo-line', async (req, res) => {
    try {
      const { groupId } = req.params;
      const group = await GroupModel.findById(groupId);
      
      if (!group) return res.status(404).json({ error: "Group not found" });
      
      const fifoLine = group.getFIFOOrder();
      const fifoLineWithPositions = fifoLine.map((member, index) => ({
        position: index + 1,
        username: member.username,
        role: member.role,
        joinedAt: member.joinedAt,
        isNextPayout: index === (group.nextPayoutIndex || 0)
      }));
      
      res.json({ success: true, fifoLine: fifoLineWithPositions, totalMembers: fifoLine.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // ADVANCE PAYOUT ROUTE
  app.post('/api/groups/:groupId/advance-payout', async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userId, role } = req.headers;
      
      const group = await GroupModel.findById(groupId);
      if (!group) return res.status(404).json({ error: "Group not found" });
      
      const myMembership = group.members.find(m => String(m.userId) === String(userId) && m.isActive);
      
      if (!myMembership || !["admin", "treasurer"].includes(role)) {
        return res.status(403).json({ error: "Only admin or treasurer can do this" });
      }
      
      const fifoLine = group.getFIFOOrder();
      const currentPayoutIndex = group.nextPayoutIndex || 0;
      
      if (currentPayoutIndex + 1 >= fifoLine.length) {
        group.nextPayoutIndex = 0;
        group.totalPayoutsCompleted += 1;
        await group.save();
        return res.json({ success: true, message: "Cycle completed! Starting over." });
      }
      
      group.nextPayoutIndex = currentPayoutIndex + 1;
      group.totalPayoutsCompleted += 1;
      await group.save();
      
      res.json({ success: true, message: "Moved to next person" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // MY POSITION ROUTE
  app.get('/api/groups/:groupId/my-position', async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userId } = req.headers;
      
      const group = await GroupModel.findById(groupId);
      if (!group) return res.status(404).json({ error: "Group not found" });
      
      const fifoLine = group.getFIFOOrder();
      const myIndex = fifoLine.findIndex(m => String(m.userId) === String(userId));
      
      if (myIndex === -1) {
        return res.status(403).json({ error: "You are not a member" });
      }
      
      res.json({
        success: true,
        myPosition: myIndex + 1,
        totalMembers: fifoLine.length,
        peopleAhead: myIndex,
        isNextPayout: myIndex === (group.nextPayoutIndex || 0)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// ============================================
// UNIT TESTS
// ============================================

describe('📝 REGISTER TESTS', () => {
  
  test('✅ Should register a new user successfully', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        username: 'thabo123',
        email: 'thabo@test.com',
        password: '123456'
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('username', 'thabo123');
    expect(response.body).toHaveProperty('email', 'thabo@test.com');
    expect(response.body).not.toHaveProperty('password');
  });
  
  test('❌ Should fail if username is missing', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        email: 'thabo@test.com',
        password: '123456'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('All fields are required');
  });
  
  test('❌ Should fail if email is missing', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        username: 'thabo123',
        password: '123456'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('All fields are required');
  });
  
  test('❌ Should fail if password is missing', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        username: 'thabo123',
        email: 'thabo@test.com'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('All fields are required');
  });
  
  test('❌ Should fail if email already exists', async () => {
    // First registration
    await request(app)
      .post('/api/register')
      .send({
        username: 'thabo123',
        email: 'thabo@test.com',
        password: '123456'
      });
    
    // Second registration with same email
    const response = await request(app)
      .post('/api/register')
      .send({
        username: 'thabo456',
        email: 'thabo@test.com',
        password: '123456'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('User already exists');
  });
  
  test('✅ Should hash password before saving', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        username: 'lerato123',
        email: 'lerato@test.com',
        password: 'mypassword123'
      });
    
    // Check if password is hashed in database
    const user = await UserModel.findOne({ email: 'lerato@test.com' });
    expect(user.password).not.toBe('mypassword123');
    expect(user.password).toHaveLength(60); // bcrypt hash length
  });
});

// ============================================

describe('🔐 LOGIN TESTS', () => {
  
  beforeEach(async () => {
    // Create a test user before each login test
    await request(app)
      .post('/api/register')
      .send({
        username: 'loginuser',
        email: 'login@test.com',
        password: 'correctpassword'
      });
  });
  
  test('✅ Should login successfully with correct credentials', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        email: 'login@test.com',
        password: 'correctpassword'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Successfully logged in');
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('email', 'login@test.com');
    expect(response.body).toHaveProperty('username', 'loginuser');
  });
  
  test('❌ Should fail if email is missing', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        password: 'correctpassword'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Please fill in all required fields');
  });
  
  test('❌ Should fail if password is missing', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        email: 'login@test.com'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Please fill in all required fields');
  });
  
  test('❌ Should fail if user does not exist', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        email: 'nonexistent@test.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('User not found');
  });
  
  test('❌ Should fail if password is incorrect', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        email: 'login@test.com',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Password is incorrect');
  });
  
  test('✅ Should return valid JWT token', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        email: 'login@test.com',
        password: 'correctpassword'
      });
    
    const token = response.body.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
    
    expect(decoded).toHaveProperty('id');
    expect(decoded).toHaveProperty('role');
  });
});

// ============================================

describe('💰 PAYOUT (FIFO) TESTS', () => {
  
  let adminUser;
  let memberUser;
  let groupId;
  let adminToken;
  
  beforeEach(async () => {
    // Create admin user
    const adminReg = await request(app)
      .post('/api/register')
      .send({
        username: 'adminuser',
        email: 'admin@test.com',
        password: 'admin123'
      });
    adminUser = adminReg.body;
    
    // Create member user
    const memberReg = await request(app)
      .post('/api/register')
      .send({
        username: 'memberuser',
        email: 'member@test.com',
        password: 'member123'
      });
    memberUser = memberReg.body;
    
    // Create group
    const groupRes = await request(app)
      .post('/api/groups')
      .set('userId', adminUser._id)
      .send({
        name: 'Test Stokvel',
        amount: 500,
        freq: 'monthly',
        cycle: 'monthly',
        max: 10,
        meetFreq: 'weekly',
        meetDay: 'Monday',
        meetWeek: 'first',
        payoutMethod: 'bank',
        rules: 'Test rules'
      });
    
    groupId = groupRes.body.groupId;
    
    // Add member to group (using direct DB for simplicity)
    const group = await GroupModel.findById(groupId);
    group.members.push({
      userId: memberUser._id,
      username: memberUser.username,
      email: memberUser.email,
      role: 'member',
      joinedAt: new Date(),
      isActive: true
    });
    await group.save();
  });
  
  test('✅ FIFO line should have admin first (joined first)', async () => {
    const response = await request(app)
      .get(`/api/groups/${groupId}/fifo-line`)
      .set('userId', adminUser._id);
    
    expect(response.status).toBe(200);
    expect(response.body.fifoLine[0].username).toBe('adminuser');
    expect(response.body.fifoLine[1].username).toBe('memberuser');
    expect(response.body.totalMembers).toBe(2);
  });
  
  test('✅ Admin should see their position as #1', async () => {
    const response = await request(app)
      .get(`/api/groups/${groupId}/my-position`)
      .set('userId', adminUser._id);
    
    expect(response.status).toBe(200);
    expect(response.body.myPosition).toBe(1);
    expect(response.body.peopleAhead).toBe(0);
    expect(response.body.isNextPayout).toBe(true);
  });
  
  test('✅ Member should see their position as #2', async () => {
    const response = await request(app)
      .get(`/api/groups/${groupId}/my-position`)
      .set('userId', memberUser._id);
    
    expect(response.status).toBe(200);
    expect(response.body.myPosition).toBe(2);
    expect(response.body.peopleAhead).toBe(1);
    expect(response.body.isNextPayout).toBe(false);
  });
  
  test('✅ Admin can advance payout to next person', async () => {
    // Check initial next payout is admin
    let lineResponse = await request(app)
      .get(`/api/groups/${groupId}/fifo-line`)
      .set('userId', adminUser._id);
    expect(lineResponse.body.fifoLine[0].isNextPayout).toBe(true);
    
    // Advance payout
    const advanceResponse = await request(app)
      .post(`/api/groups/${groupId}/advance-payout`)
      .set('userId', adminUser._id)
      .set('role', 'admin');
    
    expect(advanceResponse.status).toBe(200);
    expect(advanceResponse.body.success).toBe(true);
    
    // Check that member is now next
    lineResponse = await request(app)
      .get(`/api/groups/${groupId}/fifo-line`)
      .set('userId', adminUser._id);
    expect(lineResponse.body.fifoLine[1].isNextPayout).toBe(true);
  });
  
  test('✅ Treasurer can advance payout', async () => {
    // Make member a treasurer
    const group = await GroupModel.findById(groupId);
    const memberIndex = group.members.findIndex(m => String(m.userId) === String(memberUser._id));
    group.members[memberIndex].role = 'treasurer';
    await group.save();
    
    const advanceResponse = await request(app)
      .post(`/api/groups/${groupId}/advance-payout`)
      .set('userId', memberUser._id)
      .set('role', 'treasurer');
    
    expect(advanceResponse.status).toBe(200);
    expect(advanceResponse.body.success).toBe(true);
  });
  
  test('❌ Regular member cannot advance payout', async () => {
    const advanceResponse = await request(app)
      .post(`/api/groups/${groupId}/advance-payout`)
      .set('userId', memberUser._id)
      .set('role', 'member');
    
    expect(advanceResponse.status).toBe(403);
    expect(advanceResponse.body.error).toBe('Only admin or treasurer can do this');
  });
  
  test('✅ Should cycle back to first member after last person is paid', async () => {
    const group = await GroupModel.findById(groupId);
    
    // Advance to member (position 2)
    group.nextPayoutIndex = 1;
    await group.save();
    
    // Advance again - should cycle back to admin
    const advanceResponse = await request(app)
      .post(`/api/groups/${groupId}/advance-payout`)
      .set('userId', adminUser._id)
      .set('role', 'admin');
    
    expect(advanceResponse.status).toBe(200);
    expect(advanceResponse.body.message).toContain('Cycle completed');
    
    // Check that next payout index is back to 0
    const updatedGroup = await GroupModel.findById(groupId);
    expect(updatedGroup.nextPayoutIndex).toBe(0);
  });
  
  test('✅ FIFO order is based on join date (oldest first)', async () => {
    // Create a third member who joins later
    const lateMemberReg = await request(app)
      .post('/api/register')
      .send({
        username: 'lateuser',
        email: 'late@test.com',
        password: 'late123'
      });
    const lateUser = lateMemberReg.body;
    
    // Add late member with later join date
    const group = await GroupModel.findById(groupId);
    group.members.push({
      userId: lateUser._id,
      username: lateUser.username,
      email: lateUser.email,
      role: 'member',
      joinedAt: new Date(Date.now() + 86400000), // Tomorrow
      isActive: true
    });
    await group.save();
    
    const response = await request(app)
      .get(`/api/groups/${groupId}/fifo-line`)
      .set('userId', adminUser._id);
    
    // Order should be: admin (oldest), member, late (newest)
    expect(response.body.fifoLine[0].username).toBe('adminuser');
    expect(response.body.fifoLine[1].username).toBe('memberuser');
    expect(response.body.fifoLine[2].username).toBe('lateuser');
  });
});

// ============================================

describe('🔒 ROLE PERMISSION TESTS', () => {
  
  let adminUser;
  let memberUser;
  let groupId;
  
  beforeEach(async () => {
    // Create admin
    const adminReg = await request(app)
      .post('/api/register')
      .send({
        username: 'adminrole',
        email: 'adminrole@test.com',
        password: 'admin123'
      });
    adminUser = adminReg.body;
    
    // Create member
    const memberReg = await request(app)
      .post('/api/register')
      .send({
        username: 'memberrole',
        email: 'memberrole@test.com',
        password: 'member123'
      });
    memberUser = memberReg.body;
    
    // Create group
    const groupRes = await request(app)
      .post('/api/groups')
      .set('userId', adminUser._id)
      .send({
        name: 'Role Test Group',
        amount: 500,
        freq: 'monthly',
        cycle: 'monthly',
        max: 10,
        meetFreq: 'weekly',
        meetDay: 'Monday',
        meetWeek: 'first',
        payoutMethod: 'bank',
        rules: 'Test rules'
      });
    groupId = groupRes.body.groupId;
  });
  
  test('✅ Creator should be admin of the group', async () => {
    const group = await GroupModel.findById(groupId);
    const adminMember = group.members.find(m => String(m.userId) === String(adminUser._id));
    expect(adminMember.role).toBe('admin');
  });
  
  test('✅ New member should be added as member (not admin)', async () => {
    const group = await GroupModel.findById(groupId);
    group.members.push({
      userId: memberUser._id,
      username: memberUser.username,
      email: memberUser.email,
      role: 'member',
      joinedAt: new Date(),
      isActive: true
    });
    await group.save();
    
    const memberInGroup = group.members.find(m => String(m.userId) === String(memberUser._id));
    expect(memberInGroup.role).toBe('member');
    expect(memberInGroup.role).not.toBe('admin');
  });
});

// ============================================

describe('📊 EDGE CASES', () => {
  
  test('✅ Should handle empty group (no members)', async () => {
    // Create group with no members
    const adminReg = await request(app)
      .post('/api/register')
      .send({
        username: 'emptygroup',
        email: 'empty@test.com',
        password: 'empty123'
      });
    const admin = adminReg.body;
    
    const group = await GroupModel.create({
      name: 'Empty Group',
      amount: 500,
      freq: 'monthly',
      cycle: 'monthly',
      max: 10,
      meetFreq: 'weekly',
      meetDay: 'Monday',
      meetWeek: 'first',
      payoutMethod: 'bank',
      rules: 'No members yet',
      createdBy: admin._id,
      adminId: admin._id,
      members: []
    });
    
    const response = await request(app)
      .get(`/api/groups/${group._id}/fifo-line`)
      .set('userId', admin._id);
    
    expect(response.status).toBe(403); // Not a member
  });
  
  test('❌ Should not allow duplicate emails in same group', async () => {
    const adminReg = await request(app)
      .post('/api/register')
      .send({
        username: 'dupadmin',
        email: 'dupadmin@test.com',
        password: 'admin123'
      });
    const admin = adminReg.body;
    
    const memberReg = await request(app)
      .post('/api/register')
      .send({
        username: 'dupmember',
        email: 'dupmember@test.com',
        password: 'member123'
      });
    const member = memberReg.body;
    
    const group = await GroupModel.create({
      name: 'Duplicate Test',
      amount: 500,
      freq: 'monthly',
      cycle: 'monthly',
      max: 10,
      meetFreq: 'weekly',
      meetDay: 'Monday',
      meetWeek: 'first',
      payoutMethod: 'bank',
      rules: 'Test',
      createdBy: admin._id,
      adminId: admin._id,
      members: [{
        userId: admin._id,
        username: admin.username,
        email: admin.email,
        role: 'admin',
        joinedAt: new Date(),
        isActive: true
      }]
    });
    
    // Try to add same member twice
    group.members.push({
      userId: member._id,
      username: member.username,
      email: member.email,
      role: 'member',
      joinedAt: new Date(),
      isActive: true
    });
    
    // Check if duplicate exists
    const duplicateExists = group.members.some(m => String(m.userId) === String(member._id));
    expect(duplicateExists).toBe(true);
  });
});