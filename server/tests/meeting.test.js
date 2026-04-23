const request = require('supertest');
const app = require('../index');

// Mock the database
jest.mock('../models/Meeting');
const Meeting = require('../models/Meeting');

describe('Schedule Meeting API', () => {
  
// success message when group is successfully created
  test('POST /api/groups/:groupId/meetings - returns 201 when meeting is created', async () => {
    const mockMeeting = {
      _id: 'meeting123',
      groupId: 'group123',
      title: 'Weekly Stokvel Meeting',
      date: '2025-05-01T18:00:00Z',
      location: 'Community Hall',
      agenda: '1. Contributions review',
      createdBy: 'treasurer@test.com'
    };
    
    Meeting.prototype.save = jest.fn().mockResolvedValue(mockMeeting);
    
    const response = await request(app)
      .post('/api/groups/group123/meetings')
      .send({
        title: 'Weekly Stokvel Meeting',
        date: '2025-05-01T18:00:00Z',
        location: 'Community Hall',
        agenda: '1. Contributions review',
        createdBy: 'treasurer@test.com'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Weekly Stokvel Meeting');
  });


  // error message when user isnt a treasurer or admin
  test('POST /api/groups/:groupId/meetings - returns 403 when user is not treasurer/admin', async () => {
    const response = await request(app)
      .post('/api/groups/group123/meetings')
      .send({
        title: 'Weekly Meeting',
        date: '2025-05-01T18:00:00Z',
        createdBy: 'member@test.com'
      });
    
    expect(response.status).toBe(403);
  });


  // make sure date is future
  test('POST /api/groups/:groupId/meetings - returns 400 when date is in past', async () => {
    const response = await request(app)
      .post('/api/groups/group123/meetings')
      .send({
        title: 'Past Meeting',
        date: '2020-01-01T18:00:00Z',
        createdBy: 'treasurer@test.com'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('future');
  });


  // display meetings
  test('GET /api/groups/:groupId/meetings - returns list of meetings', async () => {
    const mockMeetings = [
      { title: 'Meeting 1', date: '2025-05-01' },
      { title: 'Meeting 2', date: '2025-05-15' }
    ];
    
    Meeting.find = jest.fn().mockResolvedValue(mockMeetings);
    
    const response = await request(app)
      .get('/api/groups/group123/meetings');
    
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
  });
});