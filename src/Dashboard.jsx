import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";
import cdassLogo from "./assets/cdass-logo.png";

function Dashboard() {
  const [tools, setTools] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [liveDateTime, setLiveDateTime] = useState(new Date());
  const [showProfile, setShowProfile] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // ✅ Load notifications from localStorage so they persist on refresh
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("notifications");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [toolUsage, setToolUsage] = useState(() => {
    try {
      const saved = localStorage.getItem("toolUsage");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // ✅ Use a ref to track previous tools list WITHOUT causing re-renders
  // This is the KEY fix — we compare old vs new tool data on every poll
  const prevToolsRef = useRef(() => {
    try {
      const saved = localStorage.getItem("prevToolsSnapshot");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    try {
      return savedUser
        ? JSON.parse(savedUser)
        : {
            name: "Vinit",
            surname: "Nagar",
            email: "vinit.nagar@example.com",
            role: "Admin",
          };
    } catch (e) {
      return { name: "User", surname: "", email: "", role: "Viewer" };
    }
  });

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const openDashboard = () => { setCurrentView("dashboard"); setSidebarOpen(false); };
  const openProfile   = () => { setCurrentView("profile");   setSidebarOpen(false); };
  const openUsers     = () => { setCurrentView("users");     setSidebarOpen(false); };
  const openAiTools   = () => { setCurrentView("aitools");   setSidebarOpen(false); };

  const recordToolUsage = (toolId) => {
    setToolUsage((prev) => {
      const updated = {
        ...prev,
        [toolId]: {
          count: (prev[toolId]?.count || 0) + 1,
          lastUsed: Date.now(),
        },
      };
      localStorage.setItem("toolUsage", JSON.stringify(updated));
      return updated;
    });
  };

  const getRecentlyUsedTools = () => {
    const used = tools.filter((t) => toolUsage[t.id]?.lastUsed);
    const unused = tools.filter((t) => !toolUsage[t.id]?.lastUsed);
    used.sort((a, b) => (toolUsage[b.id]?.lastUsed || 0) - (toolUsage[a.id]?.lastUsed || 0));
    return [...used, ...unused].slice(0, 3);
  };

  const renderIcon = (iconPath, className) => {
    const isImage = iconPath && iconPath.includes(".");
    if (isImage) {
      const cleanPath = iconPath.replace(/^public[\\/]/, "").replace(/^[\\/]/, "");
      return (
        <img
          src={`/${cleanPath}`}
          alt="icon"
          className={className}
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "block";
          }}
        />
      );
    }
    return <span className="fallback-emoji">{iconPath || "🤖"}</span>;
  };

  // ✅ Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Close both dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ FIXED: Poll every 10s and detect ADD, DELETE, and UPDATE changes
  useEffect(() => {
    const fetchTools = () => {
      fetch(`${import.meta.env.VITE_API_URL}/api/dashboard-tools`)
        .then((res) => res.json())
        .then((data) => {
          const toolList = Array.isArray(data) ? data : [];
          const now = new Date().toLocaleTimeString();
          const newNotifs = [];

          // Load previous snapshot from localStorage
          let prevSnapshot = null;
          try {
            const saved = localStorage.getItem("prevToolsSnapshot");
            prevSnapshot = saved ? JSON.parse(saved) : null;
          } catch (e) {
            prevSnapshot = null;
          }

          if (prevSnapshot !== null) {
            // ✅ Build maps for easy comparison
            const prevMap = {};
            prevSnapshot.forEach((t) => { prevMap[t.id] = t; });

            const currMap = {};
            toolList.forEach((t) => { currMap[t.id] = t; });

            // ✅ Detect ADDED tools
            toolList.forEach((t) => {
              if (!prevMap[t.id]) {
                newNotifs.push({ message: `🆕 Tool added: "${t.title}"`, time: now });
              }
            });

            // ✅ Detect DELETED tools
            prevSnapshot.forEach((t) => {
              if (!currMap[t.id]) {
                newNotifs.push({ message: `🗑️ Tool removed: "${t.title}"`, time: now });
              }
            });

            // ✅ Detect UPDATED tools (title or link changed)
            toolList.forEach((t) => {
              const prev = prevMap[t.id];
              if (prev) {
                if (prev.title !== t.title) {
                  newNotifs.push({ message: `✏️ Tool renamed: "${prev.title}" → "${t.title}"`, time: now });
                }
                if (prev.link !== t.link) {
                  newNotifs.push({ message: `🔗 Tool link updated: "${t.title}"`, time: now });
                }
                if (prev.icon !== t.icon) {
                  newNotifs.push({ message: `🖼️ Tool icon updated: "${t.title}"`, time: now });
                }
              }
            });

            if (newNotifs.length > 0) {
              setNotifications((prev) => [...prev, ...newNotifs]);
            }
          }

          // ✅ Save current snapshot for next comparison
          localStorage.setItem("prevToolsSnapshot", JSON.stringify(toolList));
          setTools(toolList);
        })
        .catch((err) => console.error("Error loading tools:", err));
    };

    fetchTools();                                     // Run immediately on mount
    const interval = setInterval(fetchTools, 10000);  // Then every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setLiveDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ Clear All also removes from localStorage
  const clearNotifications = (e) => {
    e.stopPropagation();
    setNotifications([]);
    localStorage.removeItem("notifications");
    setShowNotifDropdown(false);
  };

  // ✅ Logout only removes auth data, keeps snapshot to avoid false notifications on next login
  const handleLogout = () => {
    localStorage.removeItem("token");
    
    // prevToolsSnapshot is intentionally kept
    window.location.href = "/login";
  };
// useEffect(() => {
//   // ✅ Auto logout after 30 minutes (1800000 ms)
//   const sessionTimer = setTimeout(() => {
//     alert("Your session has expired. Please login again.");
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     localStorage.removeItem("notifications");
//     localStorage.removeItem("toolUsage");
//     window.location.href = "/login";
//   }, 1800000); // 30 minutes

  // ✅ Cleanup timer when component unmounts
//   return () => clearTimeout(sessionTimer);
// }, []);
  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

  const userInitials = (user?.name?.[0] || "") + (user?.surname?.[0] || "");

  return (
    <div className="app-wrapper">
      <header className="top-header">
        <div className="header-left">
          <img src={cdassLogo} alt="C.Dass" className="header-logo-img" />
          <div className="header-brand">
            <span className="header-brand-name">C.DASS</span>
            <span className="header-brand-sub">AI Tools</span>
          </div>
        </div>

        <div className="header-center">
          <span className="site-title">C.Dass AI Tools</span>
        </div>

        <div className="header-right">

          {/* NOTIFICATION BELL */}
          <div
            className="notification-bell"
            ref={notifRef}
            style={{ position: "relative" }}
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
          >
            <span className="bell-icon" style={{ cursor: "pointer" }}>🔔</span>

            {notifications.length > 0 && (
              <span className="notif-badge">{notifications.length}</span>
            )}

            {showNotifDropdown && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "45px",
                  background: "#fff",
                  border: "1px solid #e0e0e0",
                  borderRadius: "12px",
                  width: "320px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  zIndex: 9999,
                  overflow: "hidden",
                }}
              >
                {/* Dropdown Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    borderBottom: "1px solid #f0f0f0",
                    background: "#fafafa",
                  }}
                >
                  <strong style={{ fontSize: "14px" }}>
                    🔔 Notifications {notifications.length > 0 && `(${notifications.length})`}
                  </strong>

                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      style={{
                        background: "#ff4d4d",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "5px 12px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <p style={{ padding: "20px", color: "#aaa", textAlign: "center", fontSize: "13px", margin: 0 }}>
                      ✅ No new notifications
                    </p>
                  ) : (
                    [...notifications].reverse().map((notif, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #f5f5f5",
                          fontSize: "13px",
                          color: "#333",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span>{notif.message}</span>
                        <small style={{ color: "#aaa", whiteSpace: "nowrap" }}>{notif.time}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="user-profile-wrapper" ref={profileRef}>
            <div className="user-info-pill" onClick={() => setShowProfile(!showProfile)}>
              <div className="user-avatar-circle">{userInitials}</div>
              <div className="user-text">
                <span className="user-name">{user.name} {user.surname}</span>
                <small className="user-role">{user.role}</small>
              </div>
            </div>

            {showProfile && (
              <div className="profile-dropdown">
                <div className="dropdown-header">User Details</div>
                <div className="dropdown-info">
                  <p><label>Full Name:</label> <span>{user.name} {user.surname}</span></p>
                  <p><label>Email:</label> <span>{user.email}</span></p>
                  <p><label>Role:</label> <span>{user.role}</span></p>
                </div>
                <button className="dropdown-logout" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <nav className="nav-menu">
            <div className={`nav-item ${currentView === "dashboard" ? "active" : ""}`} onClick={openDashboard}>📊 Dashboard</div>
            <div className={`nav-item ${currentView === "aitools" ? "active" : ""}`} onClick={openAiTools}>🧠 AI Tools Library</div>
            <div className={`nav-item ${currentView === "profile" ? "active" : ""}`} onClick={openProfile}>👤 My Profile</div>
            {isAdmin && (
              <div className={`nav-item ${currentView === "users" ? "active" : ""}`} onClick={openUsers}>👥 Users</div>
            )}
            <div className="nav-item logout" onClick={handleLogout}>🚪 Logout</div>
          </nav>
        </aside>

        <main className="main-content">
          <div className="view-container">

            {/* VIEW 1: DASHBOARD */}
            {currentView === "dashboard" && (
              <>
                <section className="welcome-section">
                  <div className="welcome-text">
                    <h1>Welcome, {user.name}</h1>
                    <p>Your AI tools dashboard overview</p>
                  </div>
                  <div className="live-clock">{formatDate(liveDateTime)}</div>
                </section>

                <div className="content-body">
                  <h3 className="section-title">Recently Used Tools</h3>
                  <div className="tool-grid">
                    {getRecentlyUsedTools().map((tool) => (
                      <div key={tool.id} className="tool-card" style={{ cursor: "pointer" }}>
                        <div className="card-icon">
                          {renderIcon(tool.icon, "dashboard-card-img")}
                          <span className="fallback-emoji" style={{ display: "none", fontSize: "3rem" }}>🤖</span>
                        </div>
                        <h4>{tool.title}</h4>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* VIEW 2: AI TOOLS LIBRARY */}
            {currentView === "aitools" && (
              <div className="aitools-container">
                <div className="aitools-header">
                  <h2>Available AI Tools</h2>
                  <p>Launch specialized modules directly from your dashboard.</p>
                </div>
                <div className="ai-tool-card-grid">
                  {tools.map((tool) => (
                    <a
                      key={tool.id}
                      href={tool.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ai-tool-card-link"
                      onClick={() => recordToolUsage(tool.id)}
                    >
                      <div className="ai-tool-card">
                        <div className="ai-tool-card-icon">
                          {renderIcon(tool.icon, "ai-tool-img")}
                          <span className="fallback-emoji" style={{ display: "none", fontSize: "3rem" }}>🤖</span>
                        </div>
                        <h4 className="ai-tool-card-title">{tool.title}</h4>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 3: PROFILE */}
            {currentView === "profile" && (
              <div className="profile-page-card">
                <h2>Account Information</h2>
                <div className="profile-details-grid">
                  <div className="info-group"><label>Name</label><input type="text" value={user.name} readOnly /></div>
                  <div className="info-group"><label>Email Address</label><input type="email" value={user.email} readOnly /></div>
                  <div className="info-group"><label>User Role</label><div><span className="role-tag">{user.role}</span></div></div>
                </div>
              </div>
            )}

            {/* VIEW 4: USERS (Admin only) */}
            {currentView === "users" && (
              <div className="users-table-container">
                <h2>Platform Users</h2>
                <table className="users-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr>
                      <td>{user.name} {user.surname}</td>
                      <td>{user.email}</td>
                      <td><span className="role-badge admin">Admin</span></td>
                      <td><span className="status-online">Online</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;