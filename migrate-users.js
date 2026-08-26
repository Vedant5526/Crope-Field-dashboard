const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crop_field_dashboard'
  });
  const sql = "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, full_name VARCHAR(100) NOT NULL, role VARCHAR(30) DEFAULT 'Farmer', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_login DATETIME)";
  await pool.query(sql);
  console.log('users table ready');
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
