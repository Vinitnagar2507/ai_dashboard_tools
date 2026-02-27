const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

// Database Connection
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'ai_tools_db'
});


// --- NEW ROUTE: Fetch Tools for Dashboard ---
app.get('/api/dashboard-tools', async (req, res) => {
  try {
    // This fetches all tools from your 'tools' table
    const [rows] = await db.query("SELECT * FROM tools");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: "Error fetching tools from database" });
  }
});

// Existing Login Route
app.post('/api/google-login', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
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
    console.error(error);
    res.status(401).json({ message: "Access Denied: Invalid Token" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));