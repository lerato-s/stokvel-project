// src/pages/LoginPage.jsx
import { useAuth0 } from '@auth0/auth0-react';

const LoginPage = () => {
  const { loginWithRedirect } = useAuth0();

  const handleGoogleLogin = () => {
    loginWithRedirect({ connection: 'google-oauth2' });
  };

  const handleEmailLogin = () => {
    loginWithRedirect({ connection: 'Username-Password-Authentication' });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo">
          <span className="logo-icon">💰</span>
          <h1>Stokvel Manager</h1>
        </div>
        <p className="tagline">Save together, grow together, payout together</p>

        <button className="btn-google" onClick={handleGoogleLogin}>
          <span>G</span> Continue with Google
        </button>

        <div className="divider">or</div>

        <button className="btn-email" onClick={handleEmailLogin}>
          <span>✉️</span> Sign in with Email
        </button>

        <p className="terms">By continuing, you agree to our Terms of Service</p>
      </div>

      <style>{`
        /* Import fonts */
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');

        /* Root variables – your theme */
        :root {
          --bg: #0e0c14;
          --surface: #131929;
          --surface2: #1a2238;
          --border: #252d45;
          --gold: #9b7fd4;
          --gold-light: #c4a8f0;
          --green: #4caf7d;
          --red: #e05c5c;
          --text: #f0eeff;
          --text-muted: #7a7a9a;
          --text-dim: #3e3e5e;
          --radius: 12px;
          --radius-lg: 18px;
          --font-display: 'Playfair Display', serif;
          --font-body: 'DM Sans', sans-serif;
        }

        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--font-body);
          margin: 0;
          padding: 20px;
        }

        .login-card {
          background: var(--surface);
          padding: 40px;
          border-radius: var(--radius-lg);
          text-align: center;
          width: 400px;
          max-width: 90%;
          border: 1px solid var(--border);
          box-shadow: 0 20px 35px -10px rgba(0,0,0,0.5);
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .logo-icon {
          font-size: 42px;
        }

        h1 {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 700;
          color: var(--gold-light);
          margin: 0;
          letter-spacing: -0.5px;
        }

        .tagline {
          color: var(--text-muted);
          font-size: 14px;
          margin-bottom: 30px;
        }

        button {
          width: 100%;
          padding: 12px;
          font-size: 16px;
          font-weight: 500;
          border-radius: var(--radius);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s ease;
          font-family: var(--font-body);
        }

        .btn-google {
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text);
          margin-bottom: 12px;
        }

        .btn-google:hover {
          background: var(--border);
          border-color: var(--gold);
          color: var(--gold-light);
        }

        .btn-email {
          background: var(--gold);
          border: none;
          color: var(--bg);
          font-weight: 600;
        }

        .btn-email:hover {
          background: var(--gold-light);
          transform: translateY(-2px);
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 20px 0;
          color: var(--text-dim);
          font-size: 12px;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border);
        }

        .divider span {
          padding: 0 12px;
        }

        .terms {
          font-size: 11px;
          color: var(--text-dim);
          margin-top: 24px;
        }

        button span:first-child {
          font-weight: 700;
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;