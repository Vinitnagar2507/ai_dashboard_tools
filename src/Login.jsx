import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "./index.css";
import { setCookie } from "./cookies";

// ✅ Only this is hardcoded — everything else comes from DB
const BASE_URL = "http://localhost:5000";

function Login() {
  const [error, setError]           = useState({ type: "none", message: "" });
  const [googleLoginUrl, setGoogleLoginUrl] = useState(null); // ✅ loaded from DB
  const navigate                    = useNavigate();

  // ✅ Load google-login URL from DB config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res  = await fetch(`${BASE_URL}/api/config`);
        const data = await res.json();
        // Use api_url from DB but replace the path with /api/google-login
        // OR you can add a separate google_login_url column to your config table
        const serverBase = data.api_url
          ? new URL(data.api_url).origin          // extracts http://localhost:5000
          : BASE_URL;
        setGoogleLoginUrl(`${serverBase}/api/google-login`);
      } catch (err) {
        console.error("Could not load config:", err);
        setGoogleLoginUrl(`${BASE_URL}/api/google-login`); // fallback
      }
    };
    loadConfig();
  }, []);

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        setError({ type: "network", message: "No credentials received from Google." });
        return;
      }

      if (!googleLoginUrl) {
        setError({ type: "network", message: "Config not loaded yet. Please wait and try again." });
        return;
      }

      // ✅ URL is dynamic — comes from DB
      const response = await fetch(googleLoginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.user.email && data.user.email.toLowerCase().includes("vinit")) {
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
          <p className="error-text" style={{ color: "red", marginTop: "10px" }}>
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;