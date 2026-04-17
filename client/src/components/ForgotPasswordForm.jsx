import React from "react";
import { Link } from "react-router-dom";
import "../pages/ForgotPassword.css";

function ForgotPasswordForm({
  handleSubmit,
  email,
  setEmail,
  message,
  error,
  loading
}) {
  return (
    <section className="forgot-wrapper">
      <header>
        <h1>Forgot Password?</h1>
        <p>Enter your email to receive a reset link.</p>
      </header>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit">
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </form>

      <section className="back-link">
        <Link to="/login">← Back to Login</Link>
      </section>
    </section>
  );
}

export default ForgotPasswordForm;