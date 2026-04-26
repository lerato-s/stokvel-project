import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../pages/Login.css';

function AcceptInvite() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const token = searchParams.get('token');
    const groupId = searchParams.get('groupId');

    useEffect(() => {
        if (!token || !groupId) {
            setStatus('error');
            setMessage('Invalid invite link');
            return;
        }

        axios.post(`${import.meta.env.VITE_API_URL}/api/members/accept-invite`, {
            token,
            groupId
        })
        .then(() => {
            setStatus('success');
            setMessage('Invite accepted! Redirecting to login...');
            setTimeout(() => navigate('/login'), 3000);
        })
        .catch((err) => {
            setStatus('error');
            setMessage(err.response?.data?.error || 'Invalid or expired invite link');
        });
    }, []);

    return (
        <section className="wrapper">
            <header>
                <h1>Stokvel Management</h1>
            </header>

            <div style={{
                background: '#243050',
                border: '0.5px solid rgba(133, 87, 225, 0.3)',
                borderRadius: '16px',
                padding: '2rem 2.5rem',
                width: '100%',
                maxWidth: '420px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem',
                textAlign: 'center'
            }}>
                {status === 'loading' && (
                    <>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%',
                            border: '3px solid rgba(133,87,225,0.2)',
                            borderTop: '3px solid #8557e1',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                            Accepting your invite...
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: 'rgba(111,207,151,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28
                        }}>✓</div>
                        <div>
                            <h2 style={{ color: '#6fcf97', margin: '0 0 0.5rem' }}>
                                You're in!
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: 14 }}>
                                {message}
                            </p>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: 'rgba(240,149,149,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28
                        }}>✗</div>
                        <div>
                            <h2 style={{ color: '#f09595', margin: '0 0 0.5rem' }}>
                                Invite Failed
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: 14 }}>
                                {message}
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                background: '#8557e1', color: '#fff', border: 'none',
                                borderRadius: '10px', padding: '12px 24px',
                                fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer'
                            }}
                        >
                            Go to Login
                        </button>
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </section>
    );
}

export default AcceptInvite;