
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await axios.post("http://localhost:3001/login", {
        username,
        password,
      });

      console.log(result.data);

      // Navigate to dashboard or home after successful login currently we dont have the pages but soon soon 
       //navigate("/home");
      navigate("/dashboard");

    } 
    catch (error) {

      console.error("Error logging in:", error);
      setErrorMessage("Invalid username or password");

    }
  };

  return (
    
    <section className="wrapper">
      <header>
        <h1>Stokvel Management</h1>
      </header>
      <form id="form" onSubmit={handleSubmit}>
        <h1>Login</h1>
        {errorMessage && <p id="error-message">{errorMessage}</p>}

        <section>
          <label htmlFor="username">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#1f1f1f"
            >
              <path d="M367-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z" />
            </svg>
          </label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </section>

        <section>
          <label htmlFor="password">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#1f1f1f"
            >
              <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm296.5-223.5Q560-327 560-360t-23.5-56.5Q513-440 480-440t-56.5 23.5Q400-393 400-360t23.5 56.5Q447-280 480-280t56.5-23.5ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z" />
            </svg>
          </label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </section>

        <button type="submit">Sign In</button>
        <a href="http://localhost:3000/forgot-password.html">Forgot Password?</a>

      </form>

      <section className="login-link">
        <p>
          Don’t have an account? <a href="/register">Register</a>
        </p>
      </section>
    </section>
  );
}

export default Login;