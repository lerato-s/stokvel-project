import React from "react";
import { Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../pages/Login.css";

function LoginForm({
    handleSubmit,
    errorMessage,
    setEmail,
    setPassword,
    showPassword,
    setShowPassword,
    isLoading

}){
    return (
    <section className="wrapper">
      <header>
        <h1>Stokvel Management</h1>
      </header>
      <form id="form" onSubmit={handleSubmit}>
        <h1>Login</h1>
        {errorMessage && <p id="error-message">{errorMessage}</p>}

        <section>
          <label htmlFor="useremail">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480v58q0 59-40.5 100.5T740-280q-35 0-66-15t-52-43q-29 29-65.5 43.5T480-280q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480v58q0 26 17 44t43 18q26 0 43-18t17-44v-58q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93h200v80H480Zm85-315q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Z"/></svg>
          </label>
          <input
            type="text"
            id="useremail"
            name="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
            
          />
        </section>

        <section className="password-section">
          <label htmlFor="password">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
            <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm296.5-223.5Q560-327 560-360t-23.5-56.5Q513-440 480-440t-56.5 23.5Q400-393 400-360t23.5 56.5Q447-280 480-280t56.5-23.5ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z" />
            </svg>
          </label>
          
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            
          />
          <span
          className="toggle-password"
          onClick={() => setShowPassword(prev => !prev)}>
          {showPassword ? <FaEyeSlash /> : <FaEye />}
         </span>
        </section>

        <button type="submit" disabled={isLoading}>   
          {isLoading ? "Logging in..." : "Login"}
        </button>
        <Link to="/forgot-password">Forgot Password?</Link>
      </form>

      <section className="login-link">
        <p>Don't have an account? <Link to="/register">Register</Link></p>
      </section>
    </section>
  );
}

export default LoginForm;