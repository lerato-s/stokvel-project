import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../pages/login.css";
import LoginForm from "../components/LoginForm";

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // checks whether login request is happening or not -> starts at false 
  const navigate = useNavigate();

  // Add this at the top of handleSubmit to confirm state is populating
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // when user clicks login, isLoading is now true
    setErrorMessage("");

    try {
      const result = await axios.post(`${import.meta.env.VITE_API_URL}/login`, {
        email,
        password
      }, 
      {
        headers: {"Content-Type": "application/json"}
      });

      console.log("Login successful:", result.data)

      const user = result.data;
      const role = user.role;
      localStorage.setItem("user", JSON.stringify(user));
        
      if (result.data.message === "Successfully logged in"){
        if (role === "member"){
           navigate("/member-dashboard");
        }
    }

  }catch (error) {
      console.error("Error logging in:", error);
      setErrorMessage("Invalid email or password");
    } finally {
      setIsLoading(false); // failed or nah
    }
  };

  return(
    <LoginForm
        handleSubmit={handleSubmit}
        errorMessage={errorMessage}
        setEmail={setEmail}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        isLoading={isLoading}  // passed to LoginForm so we can change btn
    />
  );
}

export default Login;