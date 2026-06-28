// server/index.js
require('dotenv').config();

const express          = require('express');
const cors             = require('cors');
const cookieParser     = require('cookie-parser');
const mysql            = require('mysql2/promise');
const { OAuth2Client } = require('google-auth-library');

const app    = express();                                  // ✅ app declared FIRST
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ✅ CORS
app.use(cors({
  origin:      "http://localhost:5173",
  credentials: true,
  methods:     ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options(/.*/, cors({
  origin:      "http://localhost:5173",
  credentials: true,
}));

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());

// ─────────────────────────────────────────────
// DB Setup routes (used by SetupWizard)
// ─────────────────────────────────────────────

// POST /api/db/connect — test MySQL connection
app.post('/api/db/connect', async (req, res) => {
  const { host, port, user, password } = req.body;
  if (!host || !user) return res.status(400).json({ message: "host and user are required" });
  try {
    const conn = await mysql.createConnection({
      host, port: Number(port) || 3306,
      user, password: password || '',
      connectTimeout: 6000,
    });
    await conn.ping();
    await conn.end();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/db/create — create database if not exists
app.post('/api/db/create', async (req, res) => {
  const { host, port, user, password, database } = req.body;
  if (!database) return res.status(400).json({ message: "database name is required" });
  try {
    const conn = await mysql.createConnection({
      host, port: Number(port) || 3306,
      user, password: password || '',
    });
    await conn.execute(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.end();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/db/migrate — create all required tables
app.post('/api/db/migrate', async (req, res) => {
  const { host, port, user, password, database } = req.body;
  try {
    const conn = await mysql.createConnection({
      host, port: Number(port) || 3306,
      user, password: password || '', database,
    });
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        username   VARCHAR(80)  NOT NULL UNIQUE,
        email      VARCHAR(160) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        role       ENUM('admin','user') DEFAULT 'user',
        google_id  VARCHAR(120) DEFAULT NULL,
        name       VARCHAR(160) DEFAULT NULL,
        avatar     VARCHAR(500) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(128) NOT NULL PRIMARY KEY,
        expires    INT(11) UNSIGNED NOT NULL,
        data       MEDIUMTEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        key_name   VARCHAR(100) NOT NULL UNIQUE,
        value      TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS tools (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(160) NOT NULL,
        description TEXT,
        url         VARCHAR(500),
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.end();
    res.json({ ok: true, tables: ["users", "sessions", "settings", "tools"] });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/db/validate — confirm all tables exist
app.post('/api/db/validate', async (req, res) => {
  const { host, port, user, password, database } = req.body;
  try {
    const conn = await mysql.createConnection({
      host, port: Number(port) || 3306,
      user, password: password || '', database,
    });
    const [rows] = await conn.execute("SHOW TABLES");
    await conn.end();
    const existing = rows.map(r => Object.values(r)[0]);
    const required = ["users", "sessions", "settings", "tools"];
    const missing  = required.filter(t => !existing.includes(t));
    if (missing.length) return res.status(400).json({ message: `Missing tables: ${missing.join(", ")}` });
    res.json({ ok: true, tables: existing });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// Bootstrap DB pool
// ─────────────────────────────────────────────
const bootstrapDb = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: process.env.DB_PASSWORD || '',
  database: 'ai_tools_db',
  port:     3306,
});

let db = bootstrapDb;
let appConfig = {};

// ─────────────────────────────────────────────
// Load config from DB on startup
// ─────────────────────────────────────────────
async function loadConfigFromDB() {
  try {
    await bootstrapDb.query(`
      CREATE TABLE IF NOT EXISTS config (
        id              INT PRIMARY KEY AUTO_INCREMENT,
        db_host         VARCHAR(255),
        db_port         VARCHAR(10),
        db_user         VARCHAR(255),
        db_password     VARCHAR(255),
        db_name         VARCHAR(255),
        api_url         VARCHAR(255),
        api_url_logout  VARCHAR(255),
        app_name        VARCHAR(255),
        theme           VARCHAR(50),
        language        VARCHAR(50),
        admin_username  VARCHAR(255),
        admin_email     VARCHAR(255),
        admin_password  VARCHAR(255)
      )
    `);

    const [rows] = await bootstrapDb.query("SELECT * FROM config LIMIT 1");

    if (rows.length > 0) {
      appConfig = rows[0];
      console.log("✅ Config loaded from database");
      console.log(`   App: ${appConfig.app_name} | DB: ${appConfig.db_host}:${appConfig.db_port}/${appConfig.db_name}`);

      db = mysql.createPool({
        host:     appConfig.db_host     || 'localhost',
        user:     appConfig.db_user     || 'root',
        password: appConfig.db_password || '',
        database: appConfig.db_name     || 'ai_tools_db',
        port:     appConfig.db_port     || 3306,
      });
    } else {
      console.warn("⚠️  No config found in DB — using defaults. Please complete Setup Wizard.");
    }
  } catch (err) {
    console.warn("⚠️  Could not load config from DB:", err.message);
  }
}

// ─────────────────────────────────────────────
// GET /api/config
// ─────────────────────────────────────────────
app.get('/api/config', async (req, res) => {
  try {
    const [rows] = await bootstrapDb.query("SELECT * FROM config LIMIT 1");
    res.status(200).json(rows.length > 0 ? rows[0] : {});
  } catch (error) {
    console.warn("Error reading config:", error.message);
    res.status(200).json({});
  }
});

// ─────────────────────────────────────────────
// POST /api/config
// ─────────────────────────────────────────────
app.post('/api/config', async (req, res) => {
  const {
    db_host, db_port, db_user, db_password, db_name,
    api_url, api_url_logout,
    app_name, theme, language,
    admin_username, admin_email, admin_password,
  } = req.body;

  try {
    await bootstrapDb.query("DELETE FROM config");
    await bootstrapDb.query(`
      INSERT INTO config
        (db_host, db_port, db_user, db_password, db_name,
         api_url, api_url_logout, app_name, theme, language,
         admin_username, admin_email, admin_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      db_host, db_port, db_user, db_password, db_name,
      api_url, api_url_logout, app_name, theme, language,
      admin_username, admin_email, admin_password,
    ]);

    await loadConfigFromDB();
    res.status(200).json({ message: "Config saved successfully ✅" });

  } catch (error) {
    console.error("Error saving config:", error);
    res.status(500).json({ message: "Failed to save config", error: error.message });
  }
});

// ─────────────────────────────────────────────
// Other routes
// ─────────────────────────────────────────────
app.get('/api/dashboard-tools', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tools");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: "Error fetching tools from database" });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie("sessionId", { httpOnly: true, sameSite: "lax", path: "/" });
  res.clearCookie("token",     { httpOnly: true, sameSite: "lax", path: "/" });
  res.clearCookie("user_id",   { httpOnly: true, sameSite: "lax", path: "/" });
  res.status(200).json({ message: "Logged out successfully" });
});

app.post('/api/google-login', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken:  token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { name, email, picture } = ticket.getPayload();

    const sql = `
      INSERT INTO users (name, email, avatar)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), avatar = VALUES(avatar)
    `;
    await db.query(sql, [name, email, picture]);

    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    res.status(200).json({ user: rows[0] });

  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(401).json({ message: "Access Denied: Invalid Token" });
  }
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────
app.listen(5000, async () => {
  console.log("🚀 Server running on http://localhost:5000");
  await loadConfigFromDB();
});