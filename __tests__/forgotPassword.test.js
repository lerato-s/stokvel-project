const request = require('supertest');
const app = require('../server/index');

// Mock mongoose and UserModel so we don't need a real DB connection
jest.mock('../server/models/users');
const UserModel = require('../server/models/users');

// Prevent Jest from hanging by closing the server after tests
afterAll(async () => {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    await new Promise(resolve => setTimeout(resolve, 500));
});

describe('Forgot Password Endpoint', () => {


  test('returns 400 if no email is provided', async () => {
    const res = await request(app).post('/forgot-password').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email is required');
  });

  test('returns 404 if user is not found', async () => {
    UserModel.findOne.mockResolvedValue(null);
    const res = await request(app).post('/forgot-password').send({ email: 'notfound@test.com' });
    expect(res.status).toBe(404);
  });

  test('returns 200 if user exists', async () => {
    UserModel.findOne.mockResolvedValue({
      email: 'test@test.com',
      save: jest.fn()
    });
    const res = await request(app).post('/forgot-password').send({ email: 'test@test.com' });
    expect(res.status).toBe(200);
  });
});

describe('Reset Password Endpoint', () => {


  test('returns 400 if fields are missing', async () => {
    const res = await request(app).post('/reset-password').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('All fields are required');
  });

  test('returns 400 if password is too short', async () => {
    const res = await request(app).post('/reset-password').send({
      email: 'test@test.com', token: 'abc', newPassword: '123'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Password must be at least 6 characters');
  });

  test('returns 400 if token is invalid', async () => {
    UserModel.findOne.mockResolvedValue(null);
    const res = await request(app).post('/reset-password').send({
      email: 'test@test.com', token: 'invalidtoken', newPassword: 'password123'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  test('returns 200 if password reset is successful', async () => {
    UserModel.findOne.mockResolvedValue({
      email: 'test@test.com',
      password: 'oldpassword',
      resetToken: 'validtoken',
      save: jest.fn()
    });
    const res = await request(app).post('/reset-password').send({
      email: 'test@test.com', token: 'validtoken', newPassword: 'newpassword123'
    });
    expect(res.status).toBe(200);
  });
});