const request = require('supertest');
const app = require('../server/index');

const { render, screen, fireEvent } = require('@testing-library/react');
const Login = require('../client/src/Login').default;

// mock API call
jest.mock('axios'); 
const axios = require('axios');

describe('Loading Indicator', () => {


  /*
  test('button shows loading text when clicked', async () => {
    axios.post.mockImplementation(() => new Promise(() => {}));
    render(<Login />);
    const button = screen.getByRole('button', { name: /login/i });
    fireEvent.click(button);
    expect(screen.getByText(/logging in/i)).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
*/


  test('login endpoint responds within 5 seconds', async () => {
    const start = Date.now();
    await request(app).post('/login').send({ email: 'test@test.com', password: 'pass' });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); 
  });


  test('returns 401 when password is wrong', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'test@test.com', password: 'wrong' });
    expect(response.status).toBe(401);
  });



  test('returns 200 when credentials are correct', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'test@test.com', password: 'correct' });
    expect(response.status).toBe(200);
  });


});