const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'crop_dashboard_secret_key_2024';
const SALT_ROUNDS = 10;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crop_field_dashboard',
};

let pool;

// Connect to MySQL
async function connectDatabase() {
  try {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    // Test connection
    const conn = await pool.getConnection();
    console.log(`Successfully connected to MySQL database: ${dbConfig.database}`);
    conn.release();
  } catch (err) {
    console.error('\n======================================================');
    console.error('❌ DATABASE CONNECTION ERROR');
    console.error('Make sure your local MySQL server is running (XAMPP/WAMP/MySQL Service)');
    console.error(`Attempted Connection details: ${dbConfig.user}@${dbConfig.host}`);
    console.error(`Target Database name: ${dbConfig.database}`);
    console.error('Error message:', err.message);
    console.error('======================================================\n');
  }
}

connectDatabase();

// Middleware to check database connection
app.use((req, res, next) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection is not established. Run MySQL and restart the server.' });
  }
  next();
});

// ==============================================
// AUTH SYSTEM & USER IDENTIFICATION MIDDLEWARE
// ==============================================

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Middleware: extracts authenticated user from JWT token
// Fallback: If no token header is provided, safely selects first user to support local simulation/scripts
async function identifyUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }
  }

  // Graceful fallback for unauthenticated requests
  try {
    const [users] = await pool.query('SELECT id, username, full_name, role FROM users ORDER BY id ASC LIMIT 1');
    if (users.length > 0) {
      req.user = users[0];
      return next();
    }
  } catch (e) {}

  return res.status(401).json({ error: 'Authentication required. No user found in database.' });
}

// Strict JWT Verification Middleware (for auth verification endpoint)
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

// POST /api/auth/register — Create account & initialize default user settings
app.post('/api/auth/register', async (req, res) => {
  const { username, password, full_name, role } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'username, password and full_name are required.' });
  }
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const userRole = role || 'Farmer';
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [username.toLowerCase().trim(), hash, full_name.trim(), userRole]
    );

    const newUserId = result.insertId;

    // Automatically create connected settings row for the new user
    await pool.query(
      `INSERT INTO settings (user_id, role, weather_api_key, gov_api_key, unit_preference, weather_lat, weather_lng)
       VALUES (?, ?, '', '', 'Metric', 18.5204, 73.8567)
       ON DUPLICATE KEY UPDATE role = VALUES(role)`,
      [newUserId, userRole]
    );

    res.status(201).json({ message: 'Account created successfully. You can now log in.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username.toLowerCase().trim()]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    // Issue JWT (expires in 8 hours)
    const token = jwt.sign(
      { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me  (verify token & return current user info)
app.get('/api/auth/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/users — List registered users with field counts (Accessible by all or Admin)
app.get('/api/users', identifyUser, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.username, u.full_name, u.role, u.created_at, u.last_login,
             COUNT(DISTINCT f.id) AS field_count
      FROM users u
      LEFT JOIN fields f ON u.id = f.user_id
      GROUP BY u.id
      ORDER BY u.id ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// REST ENDPOINTS (CONNECTED TO USER & DB TABLES)
// ==============================================

// 1. SETTINGS API (Per-user settings)
app.get('/api/settings', identifyUser, async (req, res) => {
  try {
    const userId = req.user.id;
    let [rows] = await pool.query('SELECT * FROM settings WHERE user_id = ?', [userId]);
    if (rows.length === 0) {
      // Check if legacy settings row exists without user_id
      const [legacy] = await pool.query('SELECT * FROM settings WHERE user_id IS NULL OR id = 1 LIMIT 1');
      if (legacy.length > 0) {
        await pool.query('UPDATE settings SET user_id = ? WHERE id = ?', [userId, legacy[0].id]);
        [rows] = await pool.query('SELECT * FROM settings WHERE user_id = ?', [userId]);
      } else {
        // Initialize settings for this user
        await pool.query(
          'INSERT INTO settings (user_id, role, weather_api_key, gov_api_key, unit_preference, weather_lat, weather_lng) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, req.user.role || 'Farmer', '', '', 'Metric', 18.5204, 73.8567]
        );
        [rows] = await pool.query('SELECT * FROM settings WHERE user_id = ?', [userId]);
      }
    }
    res.json(rows[0] || {
      role: req.user.role || 'Farmer',
      weather_api_key: '',
      gov_api_key: '',
      unit_preference: 'Metric',
      weather_lat: 18.5204,
      weather_lng: 73.8567
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', identifyUser, async (req, res) => {
  const { role, weather_api_key, gov_api_key, unit_preference, weather_lat, weather_lng } = req.body;
  const userId = req.user.id;
  try {
    await pool.query(
      `INSERT INTO settings (user_id, role, weather_api_key, gov_api_key, unit_preference, weather_lat, weather_lng) 
       VALUES (?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         role = VALUES(role), 
         weather_api_key = VALUES(weather_api_key), 
         gov_api_key = VALUES(gov_api_key), 
         unit_preference = VALUES(unit_preference), 
         weather_lat = VALUES(weather_lat), 
         weather_lng = VALUES(weather_lng)`,
      [userId, role || req.user.role || 'Farmer', weather_api_key || '', gov_api_key || '', unit_preference || 'Metric', weather_lat || 18.5204, weather_lng || 73.8567]
    );

    // Update role in users table if changed
    if (role && role !== req.user.role) {
      await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    }

    res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. FIELDS API (Filtered by user; Admins see all)
app.get('/api/fields', identifyUser, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin';
    let query = `
      SELECT f.*, u.username AS owner_username, u.full_name AS owner_name 
      FROM fields f 
      LEFT JOIN users u ON f.user_id = u.id
    `;
    const params = [];
    if (!isAdmin) {
      query += ' WHERE f.user_id = ? OR f.user_id IS NULL';
      params.push(req.user.id);
    }
    query += ' ORDER BY f.name ASC';

    const [fields] = await pool.query(query, params);
    const fieldIds = fields.map(f => f.id);

    let history = [];
    if (fieldIds.length > 0) {
      const [histRows] = await pool.query(
        'SELECT * FROM field_history WHERE field_id IN (?) ORDER BY history_date DESC',
        [fieldIds]
      );
      history = histRows;
    }

    const enrichedFields = fields.map(f => {
      const fieldHistory = history
        .filter(h => h.field_id === f.id)
        .map(h => ({
          date: h.history_date ? h.history_date.toISOString().split('T')[0] : '',
          crop: h.crop,
          yield: h.yield_amount,
          notes: h.notes
        }));
      
      let coords = f.coordinates;
      if (typeof coords === 'string') {
        try { coords = JSON.parse(coords); } catch (e) { coords = []; }
      }

      return {
        id: f.id,
        user_id: f.user_id,
        owner_name: f.owner_name || '',
        owner_username: f.owner_username || '',
        name: f.name,
        area: parseFloat(f.area),
        soil_type: f.soil_type,
        lat: parseFloat(f.lat),
        lng: parseFloat(f.lng),
        coordinates: coords || [],
        history: fieldHistory
      };
    });

    res.json(enrichedFields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fields', identifyUser, async (req, res) => {
  const { id, name, area, soil_type, lat, lng, coordinates } = req.body;
  const userId = req.user.id;
  try {
    const coordsJSON = JSON.stringify(coordinates || []);
    await pool.query(
      'INSERT INTO fields (id, user_id, name, area, soil_type, lat, lng, coordinates) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, name, area, soil_type, lat, lng, coordsJSON]
    );
    res.json({ message: 'Field added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fields/:id', identifyUser, async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'Admin';
  try {
    if (isAdmin) {
      await pool.query('DELETE FROM fields WHERE id = ?', [id]);
    } else {
      await pool.query('DELETE FROM fields WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [id, req.user.id]);
    }
    res.json({ message: 'Field deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CROPS API (Filtered by user's fields; Admins see all)
app.get('/api/crops', identifyUser, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin';
    let query = 'SELECT crops.* FROM crops';
    const params = [];
    if (!isAdmin) {
      query += ' INNER JOIN fields ON crops.field_id = fields.id WHERE fields.user_id = ? OR fields.user_id IS NULL';
      params.push(req.user.id);
    }
    const [rows] = await pool.query(query, params);
    const crops = rows.map(c => ({
      ...c,
      sowing_date: c.sowing_date ? c.sowing_date.toISOString().split('T')[0] : '',
      harvest_date: c.harvest_date ? c.harvest_date.toISOString().split('T')[0] : ''
    }));
    res.json(crops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/crops', identifyUser, async (req, res) => {
  const { id, field_id, crop_name, variety, sowing_date, harvest_date, status, notes } = req.body;
  try {
    await pool.query(
      'INSERT INTO crops (id, field_id, crop_name, variety, sowing_date, harvest_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, field_id, crop_name, variety, sowing_date, harvest_date, status || 'Sown', notes]
    );
    res.json({ message: 'Crop assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/crops/:id/stage', identifyUser, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE crops SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Crop stage updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/crops/:id', identifyUser, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM crops WHERE id = ?', [id]);
    res.json({ message: 'Crop deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. YIELDS API (Filtered by user's fields; Admins see all)
app.get('/api/yields', identifyUser, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin';
    let query = 'SELECT yields.* FROM yields';
    const params = [];
    if (!isAdmin) {
      query += ' INNER JOIN fields ON yields.field_id = fields.id WHERE fields.user_id = ? OR fields.user_id IS NULL';
      params.push(req.user.id);
    }
    const [rows] = await pool.query(query, params);
    const yields = rows.map(y => ({
      id: y.id,
      crop_id: y.crop_id,
      crop_name: y.crop_name,
      field_id: y.field_id,
      quantity: parseFloat(y.quantity),
      unit: y.unit,
      date: y.harvest_date ? y.harvest_date.toISOString().split('T')[0] : '',
      season: y.season,
      revenue: parseFloat(y.revenue),
      cost: parseFloat(y.cost)
    }));
    res.json(yields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/yields', identifyUser, async (req, res) => {
  const { id, crop_id, crop_name, field_id, quantity, unit, date, season, revenue, cost } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Insert Yield
      await connection.query(
        `INSERT INTO yields (id, crop_id, crop_name, field_id, quantity, unit, harvest_date, season, revenue, cost) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, crop_id, crop_name, field_id, quantity, unit || 'Tons', date, season, revenue, cost]
      );

      // 2. Mark active crop as harvested
      await connection.query(
        'UPDATE crops SET status = "Harvested", harvest_date = ? WHERE id = ?',
        [date, crop_id]
      );

      // 3. Append to field history
      const historyNotes = `Harvest yield of ${quantity} ${unit || 'Tons'} logged. Revenue: $${revenue}, Cost: $${cost}`;
      await connection.query(
        'INSERT INTO field_history (field_id, history_date, crop, yield_amount, notes) VALUES (?, ?, ?, ?, ?)',
        [field_id, date, crop_name, `${quantity} ${unit || 'Tons'}`, historyNotes]
      );

      await connection.commit();
      res.json({ message: 'Yield logged and crop cycle archived successfully' });
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. PRICE ALERTS API (Scoped by user; Admins see all)
app.get('/api/price-alerts', identifyUser, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin';
    let query = 'SELECT * FROM price_alerts';
    const params = [];
    if (!isAdmin) {
      query += ' WHERE user_id = ? OR user_id IS NULL';
      params.push(req.user.id);
    }
    const [rows] = await pool.query(query, params);
    const alerts = rows.map(a => ({
      id: a.id,
      user_id: a.user_id,
      crop: a.crop,
      targetPrice: parseFloat(a.targetPrice),
      condition: a.alert_condition,
      state: a.state,
      district: a.district,
      mandi: a.mandi,
      isTriggered: Boolean(a.isTriggered),
      dateCreated: a.dateCreated ? a.dateCreated.toISOString().split('T')[0] : ''
    }));
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/price-alerts', identifyUser, async (req, res) => {
  const { id, crop, targetPrice, condition, state, district, mandi, isTriggered, dateCreated } = req.body;
  const userId = req.user.id;
  try {
    await pool.query(
      `INSERT INTO price_alerts (id, user_id, crop, targetPrice, alert_condition, state, district, mandi, isTriggered, dateCreated) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, crop, targetPrice, condition || 'above', state, district, mandi, isTriggered ? 1 : 0, dateCreated]
    );
    res.json({ message: 'Price alert created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/price-alerts/:id/trigger', identifyUser, async (req, res) => {
  const { id } = req.params;
  const { isTriggered } = req.body;
  try {
    await pool.query('UPDATE price_alerts SET isTriggered = ? WHERE id = ?', [isTriggered ? 1 : 0, id]);
    res.json({ message: 'Price alert trigger updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/price-alerts/:id', identifyUser, async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'Admin';
  try {
    if (isAdmin) {
      await pool.query('DELETE FROM price_alerts WHERE id = ?', [id]);
    } else {
      await pool.query('DELETE FROM price_alerts WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [id, req.user.id]);
    }
    res.json({ message: 'Price alert deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. SENSOR READINGS API (Scoped to user's fields; Admins see all)
app.get('/api/sensor-readings', identifyUser, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin';
    let query = 'SELECT sr.* FROM sensor_readings sr';
    const params = [];
    if (!isAdmin) {
      query += ' INNER JOIN fields f ON sr.field_id = f.id WHERE f.user_id = ? OR f.user_id IS NULL';
      params.push(req.user.id);
    }
    query += ' ORDER BY sr.timestamp ASC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sensor-readings/:fieldId', identifyUser, async (req, res) => {
  const { fieldId } = req.params;
  const days = parseInt(req.query.days) || 7;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM sensor_readings
       WHERE field_id = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY timestamp DESC LIMIT 100`,
      [fieldId, days]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/field-history', identifyUser, async (req, res) => {
  const { field_id, history_date, crop, yield_amount, notes } = req.body;
  if (!field_id || !history_date || !notes) {
    return res.status(400).json({ error: 'field_id, history_date and notes are required.' });
  }
  try {
    await pool.query(
      'INSERT INTO field_history (field_id, history_date, crop, yield_amount, notes) VALUES (?, ?, ?, ?, ?)',
      [field_id, history_date, crop || 'General', yield_amount || '—', notes]
    );
    res.status(201).json({ message: 'Log entry added.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sensor-readings', identifyUser, async (req, res) => {
  const { field_id, timestamp, moisture, temp_soil, temp_ambient, humidity_ambient, ph } = req.body;
  try {
    await pool.query(
      `INSERT INTO sensor_readings (field_id, timestamp, moisture, temp_soil, temp_ambient, humidity_ambient, ph) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [field_id, timestamp, moisture, temp_soil, temp_ambient, humidity_ambient, ph]
    );
    res.json({ message: 'Sensor readings recorded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. SENSOR ALERTS API (Scoped to user's fields; Admins see all)
app.get('/api/sensor-alerts', identifyUser, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin';
    let query = 'SELECT sa.* FROM sensor_alerts sa';
    const params = [];
    if (!isAdmin) {
      query += ' INNER JOIN fields f ON sa.field_id = f.id WHERE f.user_id = ? OR f.user_id IS NULL';
      params.push(req.user.id);
    }
    const [rows] = await pool.query(query, params);
    const alerts = rows.map(a => ({
      id: a.id,
      field_id: a.field_id,
      type: a.alert_type,
      message: a.message,
      timestamp: a.timestamp
    }));
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sensor-alerts', identifyUser, async (req, res) => {
  const { id, field_id, type, message, timestamp } = req.body;
  try {
    await pool.query(
      `INSERT INTO sensor_alerts (id, field_id, alert_type, message, timestamp) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE message = VALUES(message), timestamp = VALUES(timestamp)`,
      [id, field_id, type, message, timestamp]
    );
    res.json({ message: 'Sensor alert recorded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sensor-alerts', identifyUser, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin';
    if (isAdmin) {
      await pool.query('DELETE FROM sensor_alerts');
    } else {
      await pool.query(
        'DELETE sa FROM sensor_alerts sa INNER JOIN fields f ON sa.field_id = f.id WHERE f.user_id = ? OR f.user_id IS NULL',
        [req.user.id]
      );
    }
    res.json({ message: 'Sensor alerts cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sensor-alerts/:id', identifyUser, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM sensor_alerts WHERE id = ?', [id]);
    res.json({ message: 'Sensor alert cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. RESET DATABASE API (Per-user demo reset)
app.post('/api/reset', identifyUser, async (req, res) => {
  const userId = req.user.id;
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Clear alerts, readings, crops, history, fields for this user
      await connection.query(
        'DELETE sa FROM sensor_alerts sa INNER JOIN fields f ON sa.field_id = f.id WHERE f.user_id = ?',
        [userId]
      );
      await connection.query(
        'DELETE sr FROM sensor_readings sr INNER JOIN fields f ON sr.field_id = f.id WHERE f.user_id = ?',
        [userId]
      );
      await connection.query('DELETE FROM price_alerts WHERE user_id = ?', [userId]);
      await connection.query(
        'DELETE y FROM yields y INNER JOIN fields f ON y.field_id = f.id WHERE f.user_id = ?',
        [userId]
      );
      await connection.query(
        'DELETE c FROM crops c INNER JOIN fields f ON c.field_id = f.id WHERE f.user_id = ?',
        [userId]
      );
      await connection.query(
        'DELETE fh FROM field_history fh INNER JOIN fields f ON fh.field_id = f.id WHERE f.user_id = ?',
        [userId]
      );
      await connection.query('DELETE FROM fields WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM settings WHERE user_id = ?', [userId]);

      // Seed Settings for user
      await connection.query(
        `INSERT INTO settings (user_id, role, weather_api_key, gov_api_key, unit_preference, weather_lat, weather_lng)
         VALUES (?, 'Farmer', '', '', 'Metric', 18.5204, 73.8567)
         ON DUPLICATE KEY UPDATE role = VALUES(role)`,
        [userId]
      );

      // Seed Fields for user
      const f1Id = 'f1_' + userId;
      const f2Id = 'f2_' + userId;
      const f3Id = 'f3_' + userId;

      await connection.query(
        `INSERT INTO fields (id, user_id, name, area, soil_type, lat, lng, coordinates) VALUES 
         (?, ?, 'North Meadow', 12.5, 'Loam', 18.5254, 73.8587, '[[18.5270, 73.8570], [18.5270, 73.8604], [18.5238, 73.8604], [18.5238, 73.8570]]'),
         (?, ?, 'East Riverfront', 8.2, 'Clay Loam', 18.5190, 73.8710, '[[18.5210, 73.8690], [18.5210, 73.8730], [18.5170, 73.8730], [18.5170, 73.8690]]'),
         (?, ?, 'Hillside Slopes', 5.4, 'Sandy Loam', 18.5080, 73.8480, '[[18.5100, 73.8460], [18.5100, 73.8500], [18.5060, 73.8500], [18.5060, 73.8460]]')`,
        [f1Id, userId, f2Id, userId, f3Id, userId]
      );

      // Seed Histories
      await connection.query(
        `INSERT INTO field_history (field_id, history_date, crop, yield_amount, notes) VALUES
         (?, '2025-05-10', 'Corn', '45 Tons', 'Good harvest, slight nitrogen depletion.'),
         (?, '2024-11-12', 'Wheat', '38 Tons', 'Normal soil moisture, minor pest attack handled.'),
         (?, '2025-04-15', 'Rice', '32 Tons', 'High water consumption due to clay content.'),
         (?, '2025-03-20', 'Soybean', '15 Tons', 'Slight soil erosion detected on north slope.')`,
        [f1Id, f1Id, f2Id, f3Id]
      );

      // Seed Crops
      const c1Id = 'c1_' + userId;
      const c2Id = 'c2_' + userId;
      const c3Id = 'c3_' + userId;
      await connection.query(
        `INSERT INTO crops (id, field_id, crop_name, variety, sowing_date, harvest_date, status, notes) VALUES
         (?, ?, 'Wheat', 'HD-2967 High Yield', '2026-06-15', '2026-10-15', 'Flowering', 'Sown early, healthy green leaves. Crop needs nitrogen check.'),
         (?, ?, 'Rice', 'Basmati-370', '2026-07-01', '2026-11-15', 'Vegetative', 'Irrigation running daily. Good growth stage.'),
         (?, ?, 'Soybeans', 'JS 335', '2026-05-10', '2026-09-10', 'Ready for Harvest', 'Pods filled nicely. Harvest scheduled next week.')`,
        [c1Id, f1Id, c2Id, f2Id, c3Id, f3Id]
      );

      // Seed Yields
      await connection.query(
        `INSERT INTO yields (id, crop_id, crop_name, field_id, quantity, unit, harvest_date, season, revenue, cost) VALUES
         (?, ?, 'Wheat', ?, 35.00, 'Tons', '2025-10-12', 'Rabi 2025', 7200.00, 2200.00),
         (?, ?, 'Corn', ?, 40.00, 'Tons', '2025-09-15', 'Kharif 2025', 6800.00, 1800.00),
         (?, ?, 'Soybeans', ?, 12.00, 'Tons', '2025-08-30', 'Kharif 2025', 4100.00, 1100.00)`,
        ['y1_' + userId, c1Id, f1Id, 'y2_' + userId, c2Id, f2Id, 'y3_' + userId, c3Id, f3Id]
      );

      // Seed Alerts
      await connection.query(
        `INSERT INTO price_alerts (id, user_id, crop, targetPrice, alert_condition, state, district, mandi, isTriggered, dateCreated) VALUES
         (?, ?, 'Wheat', 2150.00, 'above', 'Maharashtra', 'Pune', 'Pune Mandi', TRUE, '2026-08-25')`,
        ['alert_' + userId, userId]
      );

      await connection.commit();
      res.json({ message: 'Your fields and data have been reset to default seeds successfully!' });
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Maharashtra APMC Mandis Directory ─────────────────────────────────────────
const MAHARASHTRA_APMC = {
  "Pune":       ["Pune APMC"],
  "Nashik":     ["Lasalgaon APMC", "Nashik APMC", "Niphad APMC"],
  "Nanded":     ["Nanded APMC", "Dharmabad APMC"],
  "Aurangabad": ["Aurangabad APMC", "Paithan APMC"],
  "Latur":      ["Latur APMC", "Ahmedpur APMC"],
  "Ahmednagar": ["Rahuri APMC", "Sangamner APMC"],
  "Solapur":    ["Solapur APMC", "Barshi APMC"],
  "Kolhapur":   ["Kolhapur APMC"],
  "Satara":     ["Satara APMC"],
  "Sangli":     ["Sangli APMC"],
  "Akola":      ["Akola APMC"],
  "Amravati":   ["Amravati APMC"],
  "Nagpur":     ["Nagpur APMC", "Wardha APMC"]
};

const MH_COMMODITIES = ["Wheat", "Rice", "Soybeans", "Maize", "Cotton", "Onion",
                        "Tur (Pigeon Peas)", "Tomato", "Grapes", "Turmeric", "Sugarcane"];

app.get('/api/maharashtra-mandis', identifyUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query('SELECT gov_api_key FROM settings WHERE user_id = ?', [userId]).catch(() => [[]]);
    let apiKey = rows.length > 0 && rows[0].gov_api_key ? rows[0].gov_api_key.trim() : '';
    if (!apiKey) apiKey = process.env.GOV_API_KEY || '';

    const resourceId = '9ef84281-2a12-4174-a7bf-3d572bc2178a';
    let liveRecords = [];

    if (apiKey) {
      const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&limit=50&filters[state]=Maharashtra`;
      try {
        const apiRes = await fetch(url);
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          liveRecords = apiData.records || [];
        }
      } catch (_) {}
    }

    const result = {};
    for (const [district, mandis] of Object.entries(MAHARASHTRA_APMC)) {
      result[district] = {};
      for (const mandi of mandis) {
        const matched = liveRecords.filter(r =>
          r.market && r.market.toLowerCase().includes(mandi.split(' ')[0].toLowerCase())
        );
        result[district][mandi] = {
          isLive: matched.length > 0,
          prices: matched.length > 0
            ? matched.map(r => ({
                commodity: r.commodity,
                variety: r.variety,
                min: parseFloat(r.min_price) || 0,
                max: parseFloat(r.max_price) || 0,
                modal: parseFloat(r.modal_price) || 0,
                date: r.arrival_date,
                unit: "Quintal",
                currency: "INR"
              }))
            : MH_COMMODITIES.map(c => ({ commodity: c, isStaticFallback: true }))
        };
      }
    }

    res.json({ state: "Maharashtra", districts: result, isLive: liveRecords.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy endpoint for Gov Mandi Prices
app.get('/api/external/mandi-price', identifyUser, async (req, res) => {
  const { state, district, market, crop } = req.query;

  if (!state || !district || !market || !crop) {
    return res.status(400).json({ error: 'Missing query parameters (state, district, market, crop)' });
  }

  try {
    const userId = req.user.id;
    const [rows] = await pool.query('SELECT gov_api_key FROM settings WHERE user_id = ?', [userId]);
    let apiKey = rows.length > 0 && rows[0].gov_api_key ? rows[0].gov_api_key.trim() : '';

    if (!apiKey) {
      apiKey = process.env.GOV_API_KEY || '';
    }

    if (!apiKey) {
      return res.json({ isMock: true, reason: 'No API key configured. Provide OGD API key in Settings.' });
    }

    let targetCrop = crop;
    if (crop === 'Soybeans') targetCrop = 'Soyabean';
    else if (crop === 'Rice') targetCrop = 'Paddy(Common)';

    const resourceId = '9ef84281-2a12-4174-a7bf-3d572bc2178a';
    const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&limit=10&filters[state]=${encodeURIComponent(state)}&filters[district]=${encodeURIComponent(district)}&filters[market]=${encodeURIComponent(market)}&filters[commodity]=${encodeURIComponent(targetCrop)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`data.gov.in API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.records && data.records.length > 0) {
      const record = data.records[0];
      return res.json({
        isMock: false,
        min: parseFloat(record.min_price) || 0,
        max: parseFloat(record.max_price) || 0,
        modal: parseFloat(record.modal_price) || 0,
        unit: "Quintal",
        currency: "INR"
      });
    } else {
      return res.json({ isMock: true, reason: `No matching records found in data.gov.in for ${crop} at ${market}` });
    }
  } catch (error) {
    console.error('Error proxying Gov Mandi API:', error.message);
    return res.json({ isMock: true, error: error.message });
  }
});

// Serve frontend static assets from root directory
app.use(express.static(path.join(__dirname)));

// Route all page navigations back to index.html (SPA Fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`======================================================`);
  console.log(`🚀 CROP & FIELD MANAGEMENT DASHBOARD`);
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Frontend is served dynamically.`);
  console.log(`======================================================`);
});
