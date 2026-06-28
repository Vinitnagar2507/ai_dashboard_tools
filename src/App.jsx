// src/App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getCookie } from "./cookies";
import SetupWizard from "./components/SetupWizard";
import Login from "./Login";
import Dashboard from "./Dashboard";

function ProtectedRoute({ children }) {
  const token = getCookie("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [setupDone, setSetupDone] = useState(
    () => getCookie("app_setup_done") === "true"
  );

  return (
    <BrowserRouter>
      <Routes>

        {/* Setup wizard — shown first if setup not done */}
        <Route
          path="/"
          element={
            setupDone
              ? <Navigate to="/login" replace />
              : <SetupWizard onComplete={() => setSetupDone(true)} />
          }
        />

        {/* Login page */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard — protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}