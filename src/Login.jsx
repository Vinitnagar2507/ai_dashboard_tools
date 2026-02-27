import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "./index.css";
import { useEffect } from "react";

function Login() {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  
  
 
  const handleLoginSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        setError("No credentials received from Google.");
        return;
      }

      // 1. Send the Google JWT token to your Node.js backend
      const response = await fetch("http://localhost:5000/api/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await response.json();

      if (response.ok) {
        // 2. Save the official data FROM THE DATABASE (includes role and ID)
        localStorage.setItem("token", credentialResponse.credential);
        localStorage.setItem("user", JSON.stringify(data.user));

        setError("");
        navigate("/dashboard");
      } else {
        setError(data.message || "Access Denied.");
      }
    } catch (err) {
      console.error("Connection Error:", err);
      setError("Cannot connect to server. Ensure your backend is running.");
    }
  };

  const handleLoginError = () => {
    setError("Google Login Failed. Check your configuration.");
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>Login with Google</h1>
        <GoogleLogin
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
        />
        {error && <p className="error-text" style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>
    </div>
  );
}

export default Login;