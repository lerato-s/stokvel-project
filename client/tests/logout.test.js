import { describe, test, expect, beforeEach } from "vitest";

// ── Mock localStorage ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ── Logout logic (mirrors what your button does) ──────────────────────────────
function logout() {
  localStorage.removeItem('user');
}

function isLoggedIn() {
  return localStorage.getItem('user') !== null;
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('LOGOUT TESTS', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  test('User is logged in when user data exists in localStorage', () => {
    localStorage.setItem('user', JSON.stringify({
      email: 'test@test.com',
      token: 'abc123',
      username: 'testuser'
    }));

    expect(isLoggedIn()).toBe(true);
  });

  test(' Logout removes user from localStorage', () => {
    localStorage.setItem('user', JSON.stringify({
      email: 'test@test.com',
      token: 'abc123'
    }));

    expect(isLoggedIn()).toBe(true);
    logout();
    expect(isLoggedIn()).toBe(false);
  });

  test(' After logout, localStorage has no user data', () => {
    localStorage.setItem('user', JSON.stringify({
      email: 'test@test.com',
      token: 'abc123'
    }));

    logout();
    expect(localStorage.getItem('user')).toBeNull();
  });

  test(' After logout, getCurrentUser returns null', () => {
    localStorage.setItem('user', JSON.stringify({
      email: 'test@test.com',
      token: 'abc123'
    }));

    logout();
    expect(getCurrentUser()).toBeNull();
  });

  test(' Logout works even when user is already logged out', () => {
    expect(isLoggedIn()).toBe(false);
    expect(() => logout()).not.toThrow();
    expect(isLoggedIn()).toBe(false);
  });

  test(' User data is correctly stored before logout', () => {
    const user = {
      email: 'anovuyo@test.com',
      token: 'jwt_token_here',
      username: 'anovuyo',
      role: 'Admin'
    };

    localStorage.setItem('user', JSON.stringify(user));

    const stored = getCurrentUser();
    expect(stored.email).toBe('anovuyo@test.com');
    expect(stored.username).toBe('anovuyo');
    expect(stored.token).toBe('jwt_token_here');
  });

  test(' Multiple logouts do not cause errors', () => {
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com' }));

    logout();
    logout();
    logout();

    expect(isLoggedIn()).toBe(false);
  });

  test(' Logging in again after logout works correctly', () => {
    localStorage.setItem('user', JSON.stringify({ email: 'first@test.com' }));
    logout();

    expect(isLoggedIn()).toBe(false);

    localStorage.setItem('user', JSON.stringify({ email: 'second@test.com' }));

    expect(isLoggedIn()).toBe(true);
    expect(getCurrentUser().email).toBe('second@test.com');
  });

  test(' Only user data is removed, other localStorage items remain', () => {
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com' }));
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('language', 'en');

    logout();

    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('language')).toBe('en');
  });
});
