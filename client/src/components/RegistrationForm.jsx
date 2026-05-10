import React from "react";
import { Link } from "react-router-dom";
import "../pages/Registration.css";
import { FaEyeSlash, FaEye } from "react-icons/fa";

function RegistrationForm({
  username, setUsername,
  email, setEmail,
  password, setPassword,
  error, loading,
  handleRegister, handleGoogleRegister
}) {
  return (
    <section className="wrapper">
      <header><h1>Stokvel Management</h1></header>

      <div style={{
        background: "#131929",        
        border: "1px solid #252d45", 
        borderRadius: 18, padding: "2rem 2.5rem",
        width: "100%", maxWidth: 420,
        display: "flex", flexDirection: "column", gap: "1.25rem"
        }}>
        <h1 style={{ color: "#fff", margin: 0, fontSize: "1.5rem", textAlign: "center" }}>
          Register
        </h1>

        {error && (
          <p style={{ color: "#f09595", fontSize: 14, margin: 0, textAlign: "center" }}>
            {error}
          </p>
        )}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input
            type="text" placeholder="Username"
            value={username} onChange={(e) => setUsername(e.target.value)}
            style={{
                background: "#1a2238",        
                border: "1px solid #252d45", 
                borderRadius: 10, padding: "13px 14px",
                color: "#f0eeff", fontSize: 14, outline: "none",
            }}
          />
          <input
            type="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={{
                background: "#1a2238",        
                border: "1px solid #252d45", 
                borderRadius: 10, padding: "13px 14px",
                color: "#f0eeff", fontSize: 14, outline: "none",
            }}
          />
          <input
            type="password" placeholder="Password (min 6 characters)"
            value={password} onChange={(e) => setPassword(e.target.value)}
            style={{
                background: "#1a2238",        
                border: "1px solid #252d45", 
                borderRadius: 10, padding: "13px 14px",
                color: "#f0eeff", fontSize: 14, outline: "none",
            }}
          />
          <button
            type="submit" disabled={loading}
            style={{
                background: "#8557e1",       
                color: "#f0eeff",
                border: "none", borderRadius: 8,
                padding: "13px", fontSize: 15,
                fontWeight: 600, cursor: "pointer",
            }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
        </div>

        <button
          onClick={handleGoogleRegister} disabled={loading}
          style={{
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 12,
            background: "#fff", color: "#1a2238",
            border: "none", borderRadius: 10,
            padding: "12px 24px", fontSize: 15,
            fontWeight: 600, cursor: "pointer",
          }}
        >
          <img src="https://www.google.com/favicon.ico" width={20} height={20} alt="" />
          Continue with Google
        </button>

        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", margin: 0 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#8557e1" }}>Login</Link>
        </p>
      </div>
    </section>
  );
}


export default RegistrationForm;