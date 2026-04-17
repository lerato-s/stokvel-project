import { useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../pages/ResetPassword.css';
import ResetPasswordForm from '../components/ResetPasswordForm';

function ResetPassword() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const handleSubmit = async (e) => {
        e.preventDefault();

        console.log("SUBMIT FIRED")           // does this print?
        console.log("token:", token)           // is this null?
        console.log("email:", email)           // is this null?
        console.log("newPassword:", newPassword)

        if (!newPassword || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            setLoading(true);
            const result = await axios.post(`${import.meta.env.VITE_API_URL}/reset-password`, {
                email,
                token,
                newPassword
            });
            setMessage(result.data.message);
            setError('');
            setTimeout(() => navigate('/login'), 2000); // redirect after 2 seconds
        } catch (error) {
            setError(error.response?.data?.error || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ResetPasswordForm
            handleSubmit={handleSubmit}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            message={message}
            error={error}
            loading={loading}
        />
    );
}

export default ResetPassword;