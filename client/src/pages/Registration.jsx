import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../pages/Registration.css';
import RegistrationForm from '../components/RegistrationForm';

function Registration() {
    const [username , setUsername] = useState('');
    const [email , setEmail] = useState('');
    const [password , setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();


   const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate fields
    if (!username) {
        setError("Username is required");
        return;
    }
    if (!email.includes("@")) {
        setError("Enter a valid email");
        return;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
    }


    try {
        const result = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
            username,
            email,
            password,
        });

        console.log(result.data);
        navigate('/login')
    } catch (error) {
        console.error("Error registering user:", error);
        setError("Registration failed: " + (error.response?.data?.error || error.message));
    }
    
};
    return (
        <RegistrationForm
            handleSubmit={handleSubmit}
            error={error}
            setUsername={setUsername}
            setEmail={setEmail}
            setPassword={setPassword}
            setShowPassword={setShowPassword}
            showPassword={showPassword}
        />
    );
   
} 

export default Registration