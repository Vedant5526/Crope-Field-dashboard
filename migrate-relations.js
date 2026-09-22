const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crop_field_dashboard'
  });

  console.log('--- Starting Database Migration: Connect Users & Other Tables ---');

  // 1. Ensure users table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      role VARCHAR(30) DEFAULT 'Farmer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);
  console.log('✓ Users table verified');

  // Find a default fallback user (first existing user or create demo)
  const [users] = await pool.query('SELECT id, username FROM users ORDER BY id ASC LIMIT 1');
  let defaultUserId = 1;
  if (users.length > 0) {
    defaultUserId = users[0].id;
    console.log(`✓ Using existing default user: ${users[0].username} (ID: ${defaultUserId})`);
  } else {
    // Insert a default user if none exists
    const [ins] = await pool.query(`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES ('farmer', '$2b$10$wB9W81wVzYkE6u5k2oP7QeB9dY7G1vQ2Z2P7QeB9dY7G1vQ2Z2P7Q', 'Default Farmer', 'Farmer')
    `);
    defaultUserId = ins.insertId;
    console.log(`✓ Created default farmer user (ID: ${defaultUserId})`);
  }

  // Helper to check if column exists
  async function hasColumn(table, column) {
    const [cols] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
    return cols.length > 0;
  }

  // Helper to check if foreign key constraint exists
  async function hasConstraint(table, constraintName) {
    const [rows] = await pool.query(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?
    `, [process.env.DB_NAME || 'crop_field_dashboard', table, constraintName]);
    return rows.length > 0;
  }

  // 2. Add user_id to fields
  if (!(await hasColumn('fields', 'user_id'))) {
    console.log('Adding user_id column to fields...');
    await pool.query('ALTER TABLE fields ADD COLUMN user_id INT NULL');
    await pool.query('UPDATE fields SET user_id = ? WHERE user_id IS NULL', [defaultUserId]);
  } else {
    await pool.query('UPDATE fields SET user_id = ? WHERE user_id IS NULL', [defaultUserId]);
  }

  if (!(await hasConstraint('fields', 'fk_fields_user'))) {
    try {
      await pool.query('ALTER TABLE fields ADD CONSTRAINT fk_fields_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
      console.log('✓ Added foreign key fk_fields_user on fields(user_id) -> users(id)');
    } catch (e) {
      console.log('Note: constraint fk_fields_user add result:', e.message);
    }
  }

  // 3. Add user_id to settings
  if (!(await hasColumn('settings', 'user_id'))) {
    console.log('Adding user_id column to settings...');
    await pool.query('ALTER TABLE settings ADD COLUMN user_id INT NULL');
    await pool.query('UPDATE settings SET user_id = ? WHERE user_id IS NULL LIMIT 1', [defaultUserId]);
  } else {
    await pool.query('UPDATE settings SET user_id = ? WHERE user_id IS NULL LIMIT 1', [defaultUserId]);
  }

  // Ensure unique constraint on settings.user_id
  try {
    const [indexes] = await pool.query(`SHOW INDEX FROM settings WHERE Key_name = 'uniq_settings_user'`);
    if (indexes.length === 0) {
      await pool.query('ALTER TABLE settings ADD UNIQUE KEY uniq_settings_user (user_id)');
      console.log('✓ Added unique constraint on settings(user_id)');
    }
  } catch (e) {
    console.log('Note: settings index:', e.message);
  }

  if (!(await hasConstraint('settings', 'fk_settings_user'))) {
    try {
      await pool.query('ALTER TABLE settings ADD CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
      console.log('✓ Added foreign key fk_settings_user on settings(user_id) -> users(id)');
    } catch (e) {
      console.log('Note: constraint fk_settings_user add result:', e.message);
    }
  }

  // 4. Add user_id to price_alerts
  if (!(await hasColumn('price_alerts', 'user_id'))) {
    console.log('Adding user_id column to price_alerts...');
    await pool.query('ALTER TABLE price_alerts ADD COLUMN user_id INT NULL');
    await pool.query('UPDATE price_alerts SET user_id = ? WHERE user_id IS NULL', [defaultUserId]);
  } else {
    await pool.query('UPDATE price_alerts SET user_id = ? WHERE user_id IS NULL', [defaultUserId]);
  }

  if (!(await hasConstraint('price_alerts', 'fk_alerts_user'))) {
    try {
      await pool.query('ALTER TABLE price_alerts ADD CONSTRAINT fk_alerts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
      console.log('✓ Added foreign key fk_alerts_user on price_alerts(user_id) -> users(id)');
    } catch (e) {
      console.log('Note: constraint fk_alerts_user add result:', e.message);
    }
  }

  console.log('--- Migration Completed Successfully! ---');
  await pool.end();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
