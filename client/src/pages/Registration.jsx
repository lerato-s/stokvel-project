import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import RegistrationForm from "../components/RegistrationForm";


function Registration() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  console.log("Firebase config:", {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  })

  async function handleBackendAuth(firebaseUser) {
    const idToken = await firebaseUser.getIdToken();
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/auth/google`,
      { idToken }
    );
    localStorage.setItem("user", JSON.stringify(response.data));
    navigate("/group");
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    if (!username) { setError("Username is required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: username });
      await handleBackendAuth(result.user);
    } catch (err) {
      console.log("Full error:", err)        // ✅ add this
      console.log("Error code:", err.code)   // ✅ add this
      console.log("Error message:", err.message)
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleBackendAuth(result.user);
    } catch (err) {
      setError("Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RegistrationForm
      username={username}
      setUsername={setUsername}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      error={error}
      loading={loading}
      handleRegister={handleRegister}
      handleGoogleRegister={handleGoogleRegister}
    />
  );
}

export default Registration;