
import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

const Dashboard = () => {
  const { user, logout, getAccessTokenSilently, isLoading } = useAuth0();
  const [dbUser, setDbUser] = useState(null);
  const [message, setMessage] = useState('');
  const [apiResponse, setApiResponse] = useState('');
  const [syncing, setSyncing] = useState(true);

  // Sync user with backend after Auth0 login
  useEffect(() => {
    const syncUser = async () => {
      if (isLoading) return;
      if (!user) return;

      try {
        const token = await getAccessTokenSilently();
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/sync`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDbUser(response.data.user);
        setMessage(`Welcome, ${response.data.user.username || response.data.user.fullName || user.name || 'User'}!`);
        setTimeout(() => setMessage(''), 5000);
      } catch (error) {
        console.error('Sync error:', error);
        setMessage('Failed to sync user with backend');
      } finally {
        setSyncing(false);
      }
    };

    syncUser();
  }, [user, isLoading, getAccessTokenSilently]);

  // Fetch current user profile from backend (refresh)
  const fetchProfile = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/auth/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDbUser(response.data.user);
      setMessage('Profile refreshed');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Profile fetch error:', error);
      setMessage('Failed to fetch profile');
    }
  };

  // Call a protected API endpoint (example: /api/private)
  const callProtectedApi = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/private`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApiResponse(JSON.stringify(response.data, null, 2));
    } catch (error) {
      setApiResponse(`Error: ${error.message}`);
    }
  };

  if (isLoading || syncing) {
    return <div style={styles.loading}>Loading dashboard...</div>;
  }

  if (!user) {
    return <div style={styles.loading}>Please log in.</div>;
  }

  // Determine display name: priority: username > fullName > user.name > email prefix > 'User'
  const displayName = dbUser?.username || dbUser?.fullName || user.name || (user.email ? user.email.split('@')[0] : 'User');

  return (
    <div style={styles.container}>
      {/* Navigation bar */}
      <div style={styles.navbar}>
        <h2 style={styles.logo}>💰 Stokvel Manager</h2>
        <div style={styles.userInfo}>
          {user.picture && <img src={user.picture} alt="avatar" style={styles.avatar} />}
          <div>
            <div style={styles.userName}>{displayName}</div>
            <div style={styles.userEmail}>{user.email}</div>
            <div style={styles.userProvider}>Provider: {dbUser?.provider || '?'}</div>
          </div>
          <button onClick={() => logout({ returnTo: window.location.origin })} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={styles.main}>
        {message && (
          <div style={styles.successMessage}>{message}</div>
        )}

        <div style={styles.card}>
          <h3>Welcome to the stokvel Management Platform👋</h3>
          <p>Your account is linked with Auth0. No password is stored in our database.</p>
          <button onClick={fetchProfile} style={styles.primaryBtn}>
            Refresh Profile
          </button>
        </div>

        <div style={styles.card}>
          <h3>Your Profile (from your backend)</h3>
          <pre style={styles.pre}>
            {JSON.stringify(dbUser, null, 2)}
          </pre>
        </div>

        <div style={styles.card}>
          <h3>Test Protected API</h3>
          <button onClick={callProtectedApi} style={styles.successBtn}>
            Call /api/private
          </button>
          {apiResponse && (
            <pre style={styles.apiResponse}>
              {apiResponse}
            </pre>
          )}
        </div>

        <div style={styles.card}>
          <h3>Next Steps</h3>
          <ul style={styles.list}>
            <li>✅ Auth0 login works</li>
            <li>✅ User is synced to your MongoDB</li>
            <li>✅ You can now add groups, contributions, and payout queue features</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Dark theme styles (matching your login page)
const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--bg, #0e0c14)',
    fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
    color: 'var(--text, #f0eeff)'
  },
  loading: {
    textAlign: 'center',
    marginTop: '50px',
    color: 'var(--text, #f0eeff)',
    fontFamily: 'var(--font-body, "DM Sans", sans-serif)'
  },
  navbar: {
    background: 'var(--surface, #131929)',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border, #252d45)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  logo: {
    margin: 0,
    color: 'var(--gold-light, #c4a8f0)',
    fontFamily: 'var(--font-display, "Playfair Display", serif)'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '1px solid var(--gold, #9b7fd4)'
  },
  userName: {
    fontWeight: 'bold',
    color: 'var(--text, #f0eeff)'
  },
  userEmail: {
    fontSize: '12px',
    color: 'var(--text-muted, #7a7a9a)'
  },
  userProvider: {
    fontSize: '11px',
    color: 'var(--text-dim, #3e3e5e)'
  },
  logoutBtn: {
    background: 'var(--red, #e05c5c)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 'var(--radius, 12px)',
    cursor: 'pointer',
    fontWeight: '500'
  },
  main: {
    maxWidth: '800px',
    margin: '30px auto',
    padding: '0 20px'
  },
  successMessage: {
    background: 'var(--green, #4caf7d)',
    color: 'white',
    padding: '10px',
    borderRadius: 'var(--radius, 12px)',
    marginBottom: '20px',
    textAlign: 'center'
  },
  card: {
    background: 'var(--surface, #131929)',
    padding: '20px',
    borderRadius: 'var(--radius-lg, 18px)',
    border: '1px solid var(--border, #252d45)',
    marginBottom: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  },
  primaryBtn: {
    background: 'var(--gold, #9b7fd4)',
    color: 'var(--bg, #0e0c14)',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 'var(--radius, 12px)',
    cursor: 'pointer',
    fontWeight: '600',
    marginTop: '10px'
  },
  successBtn: {
    background: 'var(--green, #4caf7d)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 'var(--radius, 12px)',
    cursor: 'pointer',
    fontWeight: '600',
    marginTop: '10px'
  },
  pre: {
    background: 'var(--surface2, #1a2238)',
    padding: '10px',
    borderRadius: 'var(--radius, 12px)',
    fontSize: '12px',
    overflow: 'auto',
    color: 'var(--text, #f0eeff)',
    border: '1px solid var(--border, #252d45)'
  },
  apiResponse: {
    background: 'var(--surface2, #1a2238)',
    color: 'var(--gold-light, #c4a8f0)',
    padding: '10px',
    borderRadius: 'var(--radius, 12px)',
    fontSize: '12px',
    overflow: 'auto',
    marginTop: '10px',
    border: '1px solid var(--border, #252d45)'
  },
  list: {
    margin: '10px 0 0 20px',
    color: 'var(--text, #f0eeff)'
  }
};

export default Dashboard;