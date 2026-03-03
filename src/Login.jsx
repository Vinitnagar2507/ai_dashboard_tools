import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "./index.css";
import { setCookie } from "./cookies";

function Login() {
  const [error, setError] = useState({ type: "none", message: "" });
  const navigate = useNavigate();

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        setError({ type: "network", message: "No credentials received from Google." });
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
        // Check if email contains "vinit"
        if (data.user.email && data.user.email.toLowerCase().includes("vinit")) {
          // Save official data
          setCookie("token", credentialResponse.credential);
          setCookie("user", encodeURIComponent(JSON.stringify(data.user)));

          setError({ type: "none", message: "" });
          navigate("/dashboard");
        } else {
          setError({
            type: "email",
            message: "Email does not contain the required keyword 'vinit'."
          });
        }
      } else {
        setError({
          type: "server",
          message: data.message || "Access Denied."
        });
      }
    } catch (err) {
      console.error("Connection Error:", err);
      setError({
        type: "network",
        message: "Cannot connect to server. Ensure your backend is running."
      });
    }
  };

  const handleLoginError = () => {
    setError({
      type: "network",
      message: "Google Login Failed. Check your configuration."
    });
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>Login with Google</h1>
        <GoogleLogin
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
        />
        {error.type !== "none" && (
          <p className="error-text" style={{ color: 'red', marginTop: '10px' }}>
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;