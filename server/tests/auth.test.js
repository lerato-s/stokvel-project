jest.setTimeout(30000);

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  process.env.JWT_SECRET = 'test_secret';
  process.env.CLIENT_URL = 'http://localhost:5173';
  app = require('../app');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const UserModel = require('../models/users');
  await UserModel.deleteMany({});
});

describe('📝 REGISTER TESTS', () => {

  test('✅ Should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'thabo123', email: 'thabo@test.com', password: '123456' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('username', 'thabo123');
    expect(res.body).not.toHaveProperty('password');
  });

  test('❌ Should fail if username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'thabo@test.com', password: '123456' });

    expect(res.status).toBe(400);
  });

  test('❌ Should fail if email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'thabo123', password: '123456' });

    expect(res.status).toBe(400);
  });

  test('❌ Should fail if password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'thabo123', email: 'thabo@test.com' });

    expect(res.status).toBe(400);
  });

  test('❌ Should fail if email already exists', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'thabo123', email: 'thabo@test.com', password: '123456' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'thabo456', email: 'thabo@test.com', password: '123456' });

    expect(res.status).toBe(400);
  });

  test('✅ Should hash password before saving', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'lerato123', email: 'lerato@test.com', password: 'mypassword123' });

    const UserModel = require('../models/users');
    const user = await UserModel.findOne({ email: 'lerato@test.com' });
    expect(user.password).not.toBe('mypassword123');
  });
});

describe('🔐 LOGIN TESTS', () => {

  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'loginuser', email: 'login@test.com', password: 'correctpassword' });
  });

  test('✅ Should login successfully with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('email', 'login@test.com');
  });

  test('❌ Should fail if email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'correctpassword' });

    expect(res.status).toBe(400);
  });

  test('❌ Should fail if password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com' });

    expect(res.status).toBe(400);
  });

  test('❌ Should fail if user does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  test('❌ Should fail if password is incorrect', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  test('✅ Should return valid JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'correctpassword' });

    const decoded = jwt.verify(res.body.token, 'test_secret');
    expect(decoded).toHaveProperty('id');
    expect(decoded).toHaveProperty('role');
  });
});