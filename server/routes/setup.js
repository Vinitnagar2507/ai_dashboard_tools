// server/routes/setup.js
// Mount in index.js with: app.use('/api', require('./routes/setup'));

const express = require("express");
const mysql   = require("mysql2/promise");
const { execSync } = require("child_process");
const path    = require("path");
const fs      = require("fs");
const router  = express.Router();

// ─── In-memory config store (replace with DB/file persistence as needed) ─────
let appConfig = {};

// ── GET /api/config — load saved config ──────────────────────────────────────
router.get("/config", (req, res) => {
  res.json(appConfig);
});

// ── POST /api/config — save all config ───────────────────────────────────────
router.post("/config", async (req, res) => {
  try {
    const {
      db_host, db_port, db_user, db_password, db_name,
      api_url, api_url_logout,
      app_name, theme, language,
      admin_username, admin_email, admin_password,
    } = req.body;

    appConfig = { db_host, db_port, db_user, db_password, db_name, api_url, api_url_logout, app_name, theme, language, admin_username, admin_email };

    // Write .env to server root
    const envContent = [
      `DB_HOST=${db_host}`,
      `DB_PORT=${db_port}`,
      `DB_USER=${db_user}`,
      `DB_PASSWORD=${db_password}`,
      `DB_NAME=${db_name}`,
      `APP_NAME=${app_name}`,
      `THEME=${theme}`,
      `LANGUAGE=${language}`,
    ].join("\n");
    fs.writeFileSync(path.join(process.cwd(), ".env"), envContent, "utf8");

    // Persist admin to DB if connection is available
    if (db_host && db_user && db_name && admin_username && admin_password) {
      try {
        const bcrypt = require("bcryptjs");
        const conn = await mysql.createConnection({ host: db_host, port: Number(db_port) || 3306, user: db_user, password: db_password, database: db_name });
        const hash = await bcrypt.hash(admin_password, 12);
        await conn.execute(
          "INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, 'admin', NOW()) ON DUPLICATE KEY UPDATE password=VALUES(password), email=VALUES(email)",
          [admin_username, admin_email, hash]
        );
        await conn.end();
      } catch (dbErr) {
        console.warn("Admin insert warning:", dbErr.message);
        // Non-fatal — config still saved
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("/api/config POST:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/db/connect — test MySQL connectivity ───────────────────────────
router.post("/db/connect", async (req, res) => {
  const { host, port, user, password } = req.body;
  if (!host || !user) return res.status(400).json({ message: "host and user are required" });
  try {
    const conn = await mysql.createConnection({ host, port: Number(port) || 3306, user, password: password || "", connectTimeout: 6000 });
    await conn.ping();
    await conn.end();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── POST /api/db/create — create database if not exists ──────────────────────
router.post("/db/create", async (req, res) => {
  const { host, port, user, password, database } = req.body;
  if (!database) return res.status(400).json({ message: "database name is required" });
  try {
    const conn = await mysql.createConnection({ host, port: Number(port) || 3306, user, password: password || "" });
    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.end();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── POST /api/db/migrate — create tables ─────────────────────────────────────
router.post("/db/migrate", async (req, res) => {
  const { host, port, user, password, database } = req.body;
  try {
    const conn = await mysql.createConnection({ host, port: Number(port) || 3306, user, password: password || "", database });

    // users table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        username    VARCHAR(80)  NOT NULL UNIQUE,
        email       VARCHAR(160) NOT NULL UNIQUE,
        password    VARCHAR(255) NOT NULL,
        role        ENUM('admin','user') DEFAULT 'user',
        google_id   VARCHAR(120) DEFAULT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // sessions table (for express-session + MySQL store, if used)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id  VARCHAR(128) NOT NULL PRIMARY KEY,
        expires     INT(11) UNSIGNED NOT NULL,
        data        MEDIUMTEXT,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // settings table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        key_name  VARCHAR(100) NOT NULL UNIQUE,
        value     TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.end();
    res.json({ ok: true, tables: ["users", "sessions", "settings"] });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── POST /api/db/validate — confirm tables exist ─────────────────────────────
router.post("/db/validate", async (req, res) => {
  const { host, port, user, password, database } = req.body;
  try {
    const conn = await mysql.createConnection({ host, port: Number(port) || 3306, user, password: password || "", database });
    const required = ["users", "sessions", "settings"];
    const [rows] = await conn.execute("SHOW TABLES");
    const existing = rows.map(r => Object.values(r)[0]);
    await conn.end();
    const missing = required.filter(t => !existing.includes(t));
    if (missing.length) return res.status(400).json({ message: `Missing tables: ${missing.join(", ")}` });
    res.json({ ok: true, tables: existing });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── GET /api/check-deps — report installed npm packages ──────────────────────
// Optional: call from frontend scan step instead of mock
router.get("/check-deps", (req, res) => {
  const side = req.query.side || "backend"; // "frontend" | "backend"
  const cwd  = side === "frontend"
    ? path.join(process.cwd(), "..")   // adjust to your frontend root
    : process.cwd();

  const DEPS = side === "frontend"
    ? ["@react-oauth/google","axios","cookie-parser","js-cookie","jwt-decode","react","react-dom","react-router-dom"]
    : ["axios","cookie-parser","cors","dotenv","express","express-session","google-auth-library","mysql2"];

  const results = DEPS.map(pkg => {
    try {
      const pkgJson = require(path.join(cwd, "node_modules", pkg, "package.json"));
      return { pkg, installed: true, current: pkgJson.version };
    } catch {
      return { pkg, installed: false, current: null };
    }
  });
  res.json({ results });
});

// ── POST /api/install-deps — run npm install ──────────────────────────────────
// ⚠️  Only expose this endpoint on localhost / behind auth in production
router.post("/install-deps", (req, res) => {
  const { side = "backend", packages = [] } = req.body;
  if (!packages.length) return res.status(400).json({ message: "No packages specified" });

  const cwd = side === "frontend"
    ? path.join(process.cwd(), "..")
    : process.cwd();

  try {
    const cmd = `npm install ${packages.join(" ")} --save`;
    execSync(cmd, { cwd, stdio: "pipe", timeout: 120_000 });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.stderr?.toString() || err.message });
  }
});

module.exports = router;