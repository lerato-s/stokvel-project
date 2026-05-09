jest.setTimeout(30000);
jest.mock('../services/emailService', () => ({
  sendInviteEmail: jest.fn().mockResolvedValue(true),
  sendMeetingNotification: jest.fn().mockResolvedValue(true),
  sendMeetingMinutes: jest.fn().mockResolvedValue(true),
  sendMissingContributionEmail: jest.fn().mockResolvedValue(true),
  sendRoleAssignedEmail: jest.fn().mockResolvedValue(true),
  sendContributionReceiptEmail: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

let mongod;
let app;
let token;
let groupId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  process.env.JWT_SECRET = 'test_secret';
  process.env.CLIENT_URL = 'http://localhost:5173';
  app = require('../app');

  const UserModel = require('../models/users');
  const user = await UserModel.create({
    username: 'meetingtest',
    email: 'meetingtest@test.com',
    password: 'password123',
    role: 'member',
  });
  token = jwt.sign({ id: user._id }, 'test_secret', { expiresIn: '1d' });

  const res = await request(app)
    .post('/api/group')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Meeting Test Group',
      amount: 500,
      freq: 'Monthly',
      cycle: '12 Months',
      max: 10,
      payoutMethod: 'Fixed Order (First In First Out)',
      rules: 'Test rules',
    });
  groupId = res.body._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const Meeting = mongoose.models.Meeting;
  if (Meeting) await Meeting.deleteMany({ group: groupId });
});

describe('📅 MEETING TESTS', () => {

  test('✅ Should create a meeting successfully', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2027-05-01',
        venue: 'Community Hall',
        time: '18:00',
        notes: 'Test meeting',
        groupId,
      });

    expect(res.status).toBe(201);
    expect(res.body.venue).toBe('Community Hall');
  });

  test('❌ Should fail without token', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .send({ date: '2027-05-01', venue: 'Community Hall', groupId });

    expect(res.status).toBe(401);
  });

  test('❌ Should fail if date is missing', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({ venue: 'Community Hall', groupId });

    expect(res.status).toBe(400);
  });

  test('❌ Should fail if venue is missing', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2027-05-01', groupId });

    expect(res.status).toBe(400);
  });

  test('❌ Should fail if groupId is missing', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2027-05-01', venue: 'Community Hall' });

    expect(res.status).toBe(400);
  });

  test('✅ Should get meetings for a group', async () => {
    const res = await request(app)
      .get(`/api/meetings?groupId=${groupId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('❌ Should return 401 when getting meetings without token', async () => {
    const res = await request(app)
      .get(`/api/meetings?groupId=${groupId}`);

    expect(res.status).toBe(401);
  });

  test('❌ Should return 400 when groupId is missing', async () => {
    const res = await request(app)
      .get('/api/meetings')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});