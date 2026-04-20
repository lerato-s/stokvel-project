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

describe('Select Treasurer', () => {

    test('Admin can successfully assign a treasurer', async() => {
        
        const mockGroup = {
            _id: 'group123',
            name: 'Test group',
            members: [
                { email: 'admin@test.com', role: 'admin'},
                { email: 'member@test.com', role: 'member'}
            ],
            treasurer: null
        };

        Group.findOne.mockResolvedValue(mockGroup);
        Group.updateOne.mockResolvedValue({ modifiedCount: 1});

        const res = await request(app)
        .put()

    })
})