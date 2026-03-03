// src/cookies.js
export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

export const setCookie = (name, value, days = 7) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
};

export const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};


export const clearAppCookies = () => {
  [
    "sessionId",    // httpOnly — cleared by server via res.clearCookie()
    "token",        // ✅ ADDED — visible in your screenshot
    "toolUsage",    // ✅ already there
    "user",         // ✅ already there
    "user_id",      // ✅ ADDED — visible in your screenshot
    "notifications" // ✅ already there
  ].forEach(deleteCookie);
};