const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock all dependencies BEFORE importing routes
jest.mock('jsonwebtoken');
jest.mock('../../server/models/users');
jest.mock('../../server/models/Notification');
jest.mock('../../server/services/emailService');
jest.mock('crypto');

// Mock mongoose completely
const mockGroupModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  deleteMany: jest.fn(),
};

const mockMemberModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteMany: jest.fn(),
  countDocuments: jest.fn(),
  updateMany: jest.fn(),
};

const mockMeetingModel = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
};

// Mock mongoose.model
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn((modelName) => {
      if (modelName === 'Group') return mockGroupModel;
      if (modelName === 'Member') return mockMemberModel;
      if (modelName === 'Meeting') return mockMeetingModel;
      return {};
    }),
    Schema: class Schema {
      constructor() {}
    },
    Types: {
      ObjectId: jest.fn(() => 'mock-object-id')
    }
  };
});

// Now import the routes after mocks
const groupRoutes = require('../../server/routes/groupRoutes');
const User = require('../../server/models/users');
const Notification = require('../../server/models/Notification');
const emailService = require('../../server/services/emailService');
const crypto = require('crypto');

// Create express app
const app = express();
app.use(express.json());
app.use('/api', groupRoutes);

describe('Group Routes', () => {
  let mockUserId;
  let mockToken;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = '507f1f77bcf86cd799439011';
    mockToken = 'valid-jwt-token';
    
    // Mock JWT verify to return decoded token
    jwt.verify.mockReturnValue({ id: mockUserId });
    
    // Mock crypto
    crypto.randomBytes.mockReturnValue({
      toString: jest.fn().mockReturnValue('invite-token-123')
    });
  });

  describe('Authentication Middleware', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .get('/api/groups');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 if token is invalid', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/group', () => {
    const validGroupData = {
      name: 'Test Group',
      amount: 500,
      freq: 'Monthly',
      cycle: '12 Months',
      max: 10,
      meetDay: 'Monday',
      payoutMethod: 'Fixed Order'
    };

    it('should create a new group successfully', async () => {
      const mockUser = { _id: mockUserId, username: 'testuser', email: 'test@example.com' };
      User.findById.mockResolvedValue(mockUser);
      
      const mockGroup = { _id: 'group123', owner: mockUserId, ...validGroupData };
      mockGroupModel.create.mockResolvedValue(mockGroup);
      mockMemberModel.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/group')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validGroupData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Group');
    }, 10000);

    it('should return 400 if group name is missing', async () => {
      const response = await request(app)
        .post('/api/group')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ ...validGroupData, name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Group name is required');
    });
  });

  describe('GET /api/groups', () => {
    it('should return user groups', async () => {
      const mockUser = { _id: mockUserId, email: 'test@example.com' };
      User.findById.mockResolvedValue(mockUser);
      
      const mockOwnedGroups = [{ _id: '1', owner: mockUserId, name: 'My Group' }];
      const mockMemberGroups = [{ _id: '2', name: 'Joined Group' }];
      
      mockGroupModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockOwnedGroups)
      });
      
      mockMemberModel.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { group: mockMemberGroups[0] }
        ])
      });

      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/members', () => {
    const validInviteData = {
      name: 'John Doe',
      contact: 'john@example.com',
      groupId: 'group123'
    };

    it('should invite a new member successfully', async () => {
      const mockGroup = { _id: 'group123', owner: mockUserId, name: 'Test Group' };
      mockGroupModel.findOne.mockResolvedValue(mockGroup);
      mockMemberModel.findOne.mockResolvedValue(null);
      mockMemberModel.countDocuments.mockResolvedValue(0);
      mockMemberModel.create.mockResolvedValue({ ...validInviteData, _id: 'member123' });
      
      const mockInviter = { _id: mockUserId, username: 'admin' };
      User.findById.mockResolvedValue(mockInviter);
      
      emailService.sendInviteEmail.mockResolvedValue({});

      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validInviteData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('John Doe');
    });

    it('should return 400 if name or email missing', async () => {
      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ groupId: 'group123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name and email are required');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ ...validInviteData, contact: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('A valid email address is required');
    });
  });

  describe('POST /api/members/accept-invite', () => {
    it('should accept invite successfully', async () => {
      const mockMember = {
        _id: 'member123',
        group: 'group123',
        contact: 'john@example.com',
        inviteToken: 'valid-token',
        inviteExpiry: new Date(Date.now() + 86400000),
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      
      mockMemberModel.findOne.mockResolvedValue(mockMember);
      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/members/accept-invite')
        .send({ token: 'valid-token', groupId: 'group123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Invite accepted successfully');
    });

    it('should return 400 if token or groupId missing', async () => {
      const response = await request(app)
        .post('/api/members/accept-invite')
        .send({ token: 'token' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Token and groupId are required');
    });
  });

  describe('POST /api/meetings', () => {
    const validMeetingData = {
      date: '2024-12-25',
      time: '14:00',
      venue: 'Community Hall',
      groupId: 'group123'
    };

    it('should create a meeting successfully', async () => {
      const mockGroup = { _id: 'group123', owner: mockUserId, name: 'Test Group' };
      mockGroupModel.findById.mockResolvedValue(mockGroup);
      
      const mockMember = { contact: 'member@example.com', name: 'Member' };
      mockMemberModel.find.mockResolvedValue([mockMember]);
      
      const mockMeeting = { ...validMeetingData, _id: 'meeting123', status: 'upcoming' };
      mockMeetingModel.create.mockResolvedValue(mockMeeting);
      
      emailService.sendMeetingNotification.mockResolvedValue({});

      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validMeetingData);

      expect(response.status).toBe(201);
      expect(response.body.date).toBe('2024-12-25');
    });

    it('should return 400 if date or venue missing', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ groupId: 'group123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Date and venue are required');
    });
  });

  describe('PATCH /api/group/:id', () => {
    it('should update group', async () => {
      const mockGroup = { _id: 'group123', owner: mockUserId, name: 'Updated Group' };
      mockGroupModel.findOneAndUpdate.mockResolvedValue(mockGroup);

      const response = await request(app)
        .patch('/api/group/group123')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'Updated Group' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Group');
    });
  });

  describe('DELETE /api/group/:id', () => {
    it('should delete group', async () => {
      mockGroupModel.findOneAndDelete.mockResolvedValue({ _id: 'group123' });
      mockMemberModel.deleteMany.mockResolvedValue({});
      mockMeetingModel.deleteMany.mockResolvedValue({});

      const response = await request(app)
        .delete('/api/group/group123')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Group deleted');
    });
  });

  describe('POST /api/flag-missing', () => {
    it('should flag missing contributions', async () => {
      const mockGroup = { _id: 'group123', owner: mockUserId, name: 'Test Group', amount: 500 };
      mockGroupModel.findById.mockResolvedValue(mockGroup);
      
      // Mock the member with correct query
      mockMemberModel.findOne.mockResolvedValue({ userId: mockUserId, role: 'Treasurer' });
      
      const mockMembers = [
        { _id: '1', contact: 'member1@test.com', name: 'Member 1', contributions: [] },
        { _id: '2', contact: 'member2@test.com', name: 'Member 2', contributions: [{ month: '2024-12', status: 'paid' }] }
      ];
      mockMemberModel.find.mockResolvedValue(mockMembers);
      
      emailService.sendMissingContributionEmail.mockResolvedValue({});

      const response = await request(app)
        .post('/api/flag-missing')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ groupId: 'group123', month: '2024-12' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('flagged');
    });
  });

  describe('GET /api/groups/:groupId/payout-schedule', () => {
    it('should get payout schedule', async () => {
      const mockGroup = { _id: 'group123', owner: mockUserId, nextPayoutIndex: 0 };
      mockGroupModel.findById.mockResolvedValue(mockGroup);
      
      const mockMembers = [
        { _id: '1', name: 'Member 1', contact: 'm1@test.com', role: 'Member', createdAt: new Date(), contributions: [] },
        { _id: '2', name: 'Member 2', contact: 'm2@test.com', role: 'Member', createdAt: new Date(), contributions: [] }
      ];
      mockMemberModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockMembers)
      });

      const response = await request(app)
        .get('/api/groups/group123/payout-schedule')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/members', () => {
    it('should get members', async () => {
      const mockGroup = { _id: 'group123', owner: mockUserId };
      mockGroupModel.findById.mockResolvedValue(mockGroup);
      
      const mockMembers = [
        { _id: '1', name: 'Member 1', role: 'Member' }
      ];
      mockMemberModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockMembers)
      });

      const response = await request(app)
        .get('/api/members?groupId=group123')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});