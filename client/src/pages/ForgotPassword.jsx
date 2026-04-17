import { useState } from "react";
import axios from "axios";
import ForgotPasswordForm from "../components/ForgotPasswordForm";
import "../pages/ForgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const result = await axios.post(`${import.meta.env.VITE_API_URL}/forgot-password`, { email });
      setMessage(result.data.message);
      window.location.href = result.data.link;
    } catch (error) {
      setError(error.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);  // ✅ moved into finally so it always runs
    }
  };

  return (
    <ForgotPasswordForm
      handleSubmit={handleSubmit}
      email={email}
      setEmail={setEmail}
      message={message}
      error={error}
      loading={loading}
    />
  );
}

export default ForgotPassword;