const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
// REST ENDPOINTS
// ==============================================

// 1. SETTINGS API
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1');
    if (rows.length === 0) {
      // Return defaults if empty
      return res.json({
        role: "Farmer",
        weather_api_key: "",
        gov_api_key: "",
        unit_preference: "Metric",
        weather_lat: 18.5204,
        weather_lng: 73.8567
      });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  const { role, weather_api_key, gov_api_key, unit_preference, weather_lat, weather_lng } = req.body;
  try {
    await pool.query(
      `INSERT INTO settings (id, role, weather_api_key, gov_api_key, unit_preference, weather_lat, weather_lng) 
       VALUES (1, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         role = VALUES(role), 
         weather_api_key = VALUES(weather_api_key), 
         gov_api_key = VALUES(gov_api_key), 
         unit_preference = VALUES(unit_preference), 
         weather_lat = VALUES(weather_lat), 
         weather_lng = VALUES(weather_lng)`,
      [role, weather_api_key || '', gov_api_key || '', unit_preference || 'Metric', weather_lat || 18.5204, weather_lng || 73.8567]
    );
    res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. FIELDS API
app.get('/api/fields', async (req, res) => {
  try {
    const [fields] = await pool.query('SELECT * FROM fields');
    const [history] = await pool.query('SELECT * FROM field_history ORDER BY history_date DESC');

    // Attach history array to fields
    const enrichedFields = fields.map(f => {
      const fieldHistory = history
        .filter(h => h.field_id === f.id)
        .map(h => ({
          date: h.history_date.toISOString().split('T')[0],
          crop: h.crop,
          yield: h.yield_amount,
          notes: h.notes
        }));
      
      // coordinates column is parsed if it's stored as JSON
      let coords = f.coordinates;
      if (typeof coords === 'string') {
        try { coords = JSON.parse(coords); } catch (e) { coords = []; }
      }

      return {
        id: f.id,
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

app.post('/api/fields', async (req, res) => {
  const { id, name, area, soil_type, lat, lng, coordinates } = req.body;
  try {
    const coordsJSON = JSON.stringify(coordinates || []);
    await pool.query(
      'INSERT INTO fields (id, name, area, soil_type, lat, lng, coordinates) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, area, soil_type, lat, lng, coordsJSON]
    );
    res.json({ message: 'Field added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fields/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM fields WHERE id = ?', [id]);
    res.json({ message: 'Field deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CROPS API
app.get('/api/crops', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM crops');
    const crops = rows.map(c => ({
      ...c,
      sowing_date: c.sowing_date.toISOString().split('T')[0],
      harvest_date: c.harvest_date.toISOString().split('T')[0]
    }));
    res.json(crops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/crops', async (req, res) => {
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

app.put('/api/crops/:id/stage', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE crops SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Crop stage updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/crops/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM crops WHERE id = ?', [id]);
    res.json({ message: 'Crop deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. YIELDS API
app.get('/api/yields', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM yields');
    const yields = rows.map(y => ({
      id: y.id,
      crop_id: y.crop_id,
      crop_name: y.crop_name,
      field_id: y.field_id,
      quantity: parseFloat(y.quantity),
      unit: y.unit,
      date: y.harvest_date.toISOString().split('T')[0],
      season: y.season,
      revenue: parseFloat(y.revenue),
      cost: parseFloat(y.cost)
    }));
    res.json(yields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/yields', async (req, res) => {
  const { id, crop_id, crop_name, field_id, quantity, unit, date, season, revenue, cost } = req.body;
  try {
    // Start transactional process: Add yield, set status to harvested, and append field_history
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

// 5. PRICE ALERTS API
app.get('/api/price-alerts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM price_alerts');
    const alerts = rows.map(a => ({
      id: a.id,
      crop: a.crop,
      targetPrice: parseFloat(a.targetPrice),
      condition: a.alert_condition,
      state: a.state,
      district: a.district,
      mandi: a.mandi,
      isTriggered: Boolean(a.isTriggered),
      dateCreated: a.dateCreated.toISOString().split('T')[0]
    }));
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/price-alerts', async (req, res) => {
  const { id, crop, targetPrice, condition, state, district, mandi, isTriggered, dateCreated } = req.body;
  try {
    await pool.query(
      `INSERT INTO price_alerts (id, crop, targetPrice, alert_condition, state, district, mandi, isTriggered, dateCreated) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, crop, targetPrice, condition || 'above', state, district, mandi, isTriggered ? 1 : 0, dateCreated]
    );
    res.json({ message: 'Price alert created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/price-alerts/:id/trigger', async (req, res) => {
  const { id } = req.params;
  const { isTriggered } = req.body;
  try {
    await pool.query('UPDATE price_alerts SET isTriggered = ? WHERE id = ?', [isTriggered ? 1 : 0, id]);
    res.json({ message: 'Price alert trigger updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/price-alerts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM price_alerts WHERE id = ?', [id]);
    res.json({ message: 'Price alert deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. SENSOR READINGS API
app.get('/api/sensor-readings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sensor_readings ORDER BY timestamp ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sensor-readings', async (req, res) => {
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

// 7. SENSOR ALERTS API
app.get('/api/sensor-alerts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sensor_alerts');
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

app.post('/api/sensor-alerts', async (req, res) => {
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

app.delete('/api/sensor-alerts', async (req, res) => {
  try {
    await pool.query('DELETE FROM sensor_alerts');
    res.json({ message: 'Sensor alerts cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sensor-alerts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM sensor_alerts WHERE id = ?', [id]);
    res.json({ message: 'Sensor alert cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. RESET DATABASE API (For demo / recovery)
app.post('/api/reset', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query('DELETE FROM sensor_alerts');
      await connection.query('DELETE FROM sensor_readings');
      await connection.query('DELETE FROM price_alerts');
      await connection.query('DELETE FROM yields');
      await connection.query('DELETE FROM crops');
      await connection.query('DELETE FROM field_history');
      await connection.query('DELETE FROM fields');
      await connection.query('DELETE FROM settings');

      // Seed Settings
      await connection.query(
        `INSERT INTO settings (id, role, weather_api_key, gov_api_key, unit_preference, weather_lat, weather_lng)
         VALUES (1, 'Farmer', '', '', 'Metric', 18.5204, 73.8567)`
      );

      // Seed Fields
      await connection.query(
        `INSERT INTO fields (id, name, area, soil_type, lat, lng, coordinates) VALUES 
         ('f1', 'North Meadow', 12.5, 'Loam', 18.5254, 73.8587, '[[18.5270, 73.8570], [18.5270, 73.8604], [18.5238, 73.8604], [18.5238, 73.8570]]'),
         ('f2', 'East Riverfront', 8.2, 'Clay Loam', 18.5190, 73.8710, '[[18.5210, 73.8690], [18.5210, 73.8730], [18.5170, 73.8730], [18.5170, 73.8690]]'),
         ('f3', 'Hillside Slopes', 5.4, 'Sandy Loam', 18.5080, 73.8480, '[[18.5100, 73.8460], [18.5100, 73.8500], [18.5060, 73.8500], [18.5060, 73.8460]]')`
      );

      // Seed Histories
      await connection.query(
        `INSERT INTO field_history (field_id, history_date, crop, yield_amount, notes) VALUES
         ('f1', '2025-05-10', 'Corn', '45 Tons', 'Good harvest, slight nitrogen depletion.'),
         ('f1', '2024-11-12', 'Wheat', '38 Tons', 'Normal soil moisture, minor pest attack handled.'),
         ('f2', '2025-04-15', 'Rice', '32 Tons', 'High water consumption due to clay content.'),
         ('f3', '2025-03-20', 'Soybean', '15 Tons', 'Slight soil erosion detected on north slope.')`
      );

      // Seed Crops
      await connection.query(
        `INSERT INTO crops (id, field_id, crop_name, variety, sowing_date, harvest_date, status, notes) VALUES
         ('c1', 'f1', 'Wheat', 'HD-2967 High Yield', '2026-06-15', '2026-10-15', 'Flowering', 'Sown early, healthy green leaves. Crop needs nitrogen check.'),
         ('c2', 'f2', 'Rice', 'Basmati-370', '2026-07-01', '2026-11-15', 'Vegetative', 'Irrigation running daily. Good growth stage.'),
         ('c3', 'f3', 'Soybeans', 'JS 335', '2026-05-10', '2026-09-10', 'Ready for Harvest', 'Pods filled nicely. Harvest scheduled next week.')`
      );

      // Seed Yields
      await connection.query(
        `INSERT INTO yields (id, crop_id, crop_name, field_id, quantity, unit, harvest_date, season, revenue, cost) VALUES
         ('y1', 'c_old_1', 'Wheat', 'f1', 35.00, 'Tons', '2025-10-12', 'Rabi 2025', 7200.00, 2200.00),
         ('y2', 'c_old_2', 'Corn', 'f2', 40.00, 'Tons', '2025-09-15', 'Kharif 2025', 6800.00, 1800.00),
         ('y3', 'c_old_3', 'Soybeans', 'f3', 12.00, 'Tons', '2025-08-30', 'Kharif 2025', 4100.00, 1100.00)`
      );

      // Seed Alerts
      await connection.query(
        `INSERT INTO price_alerts (id, crop, targetPrice, alert_condition, state, district, mandi, isTriggered, dateCreated) VALUES
         ('alert-1', 'Wheat', 2150.00, 'above', 'Maharashtra', 'Pune', 'Pune Mandi', TRUE, '2026-08-25')`
      );

      await connection.commit();
      res.json({ message: 'Database reset to default seeds successfully!' });
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
