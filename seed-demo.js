const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
require("dotenv").config();

async function seed() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "crop_field_dashboard",
    multipleStatements: true
  });
  const q = (sql, v) => v ? pool.query(sql, v) : pool.query(sql);
  console.log("Connected. Seeding demo data...");

  // 1. Ensure Users table and demo users exist first
  await q(`
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

  const demoHash = await bcrypt.hash("demo1234", 10);
  const adminHash = await bcrypt.hash("admin123", 10);
  await q(
    "INSERT INTO users (username,password_hash,full_name,role) VALUES (?,?,?,?),(?,?,?,?) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name)",
    ["demo", demoHash, "Demo Farmer Maharashtra", "Farmer", "admin", adminHash, "Admin User", "Admin"]
  );

  const [demoUserRows] = await q("SELECT id FROM users WHERE username = 'demo'");
  const demoUserId = demoUserRows[0].id;
  console.log(`Demo user ready with ID: ${demoUserId}`);

  // 2. Clear old dependent table data
  await q("DELETE FROM sensor_alerts");
  await q("DELETE FROM sensor_readings");
  await q("DELETE FROM price_alerts");
  await q("DELETE FROM yields");
  await q("DELETE FROM crops");
  await q("DELETE FROM field_history");
  await q("DELETE FROM fields");
  await q("DELETE FROM settings WHERE user_id = ? OR user_id IS NULL", [demoUserId]);
  console.log("Cleared old demo data.");

  // 3. Seed Settings for Demo User
  await q(
    "INSERT INTO settings (user_id, role, weather_api_key, gov_api_key, unit_preference, weather_lat, weather_lng) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE role=VALUES(role)",
    [demoUserId, "Farmer", "", "", "Metric", 18.5204, 73.8567]
  );
  console.log("Settings seeded for demo user.");

  // 4. Seed Fields with user_id
  const fields = [
    ["f1", demoUserId, "North Meadow", 12.5, "Loam", 18.5254, 73.8587, "[[18.527,73.857],[18.527,73.8604],[18.5238,73.8604],[18.5238,73.857]]"],
    ["f2", demoUserId, "East Riverfront", 8.2, "Clay Loam", 18.5190, 73.8710, "[[18.521,73.869],[18.521,73.873],[18.517,73.873],[18.517,73.869]]"],
    ["f3", demoUserId, "Hillside Slopes", 5.4, "Sandy Loam", 18.5080, 73.8480, "[[18.510,73.846],[18.510,73.850],[18.506,73.850],[18.506,73.846]]"],
    ["f4", demoUserId, "South Plateau", 10.8, "Black Cotton", 18.5010, 73.8650, "[[18.503,73.863],[18.503,73.867],[18.499,73.867],[18.499,73.863]]"],
    ["f5", demoUserId, "Western Orchards", 6.3, "Red Laterite", 18.5300, 73.8420, "[[18.532,73.840],[18.532,73.844],[18.528,73.844],[18.528,73.840]]"]
  ];
  await q("INSERT INTO fields (id,user_id,name,area,soil_type,lat,lng,coordinates) VALUES ?", [fields]);
  console.log("Fields seeded (5) linked to user " + demoUserId);

  // 5. Seed Field History
  const histories = [
    ["f1", "2025-05-10", "Corn", "45 Tons", "Good harvest slight nitrogen depletion."],
    ["f1", "2024-11-12", "Wheat", "38 Tons", "Normal soil moisture minor pest attack handled."],
    ["f1", "2024-04-20", "Maize", "29 Tons", "Dry spell mid-season yield lower than expected."],
    ["f2", "2025-04-15", "Rice", "32 Tons", "High water consumption due to clay content."],
    ["f2", "2024-10-10", "Soybeans", "18 Tons", "Excellent pod fill best crop rotation result."],
    ["f3", "2025-03-20", "Soybean", "15 Tons", "Slight soil erosion detected on north slope."],
    ["f3", "2024-09-05", "Cotton", "11 Tons", "Bollworm attack treated successfully."],
    ["f4", "2025-06-01", "Cotton", "22 Tons", "Black soil excellent for cotton."],
    ["f4", "2024-11-20", "Tur", "9 Tons", "First Tur crop. Promising nitrogen fixation."],
    ["f5", "2025-02-15", "Grapes", "8.5 Tons", "Nashik grape variety good brix level."],
    ["f5", "2024-07-01", "Onion", "21 Tons", "Lasalgaon market price Rs1400 per q."]
  ];
  await q("INSERT INTO field_history (field_id,history_date,crop,yield_amount,notes) VALUES ?", [histories]);
  console.log("Histories seeded (11).");

  // 6. Seed Crops
  const crops = [
    ["c1", "f1", "Wheat", "HD-2967 High Yield", "2026-06-15", "2026-10-15", "Flowering", "Sown early healthy green leaves. Needs nitrogen check."],
    ["c2", "f2", "Rice", "Basmati-370", "2026-07-01", "2026-11-15", "Vegetative", "Irrigation running daily. Good growth stage."],
    ["c3", "f3", "Soybeans", "JS 335", "2026-05-10", "2026-09-10", "Ready for Harvest", "Pods filled nicely. Harvest scheduled next week."],
    ["c4", "f4", "Cotton", "Bt Cotton MCU-7", "2026-05-20", "2026-12-10", "Boll Formation", "Bollguard variety. Boll count above average."],
    ["c5", "f5", "Onion", "Bhima Super Red", "2026-06-25", "2026-09-25", "Vegetative", "Kharif onion. Requires regular drip irrigation."]
  ];
  await q("INSERT INTO crops (id,field_id,crop_name,variety,sowing_date,harvest_date,status,notes) VALUES ?", [crops]);
  console.log("Crops seeded (5).");

  // 7. Seed Yields
  const yields = [
    ["y1", "c_old_1", "Wheat", "f1", 35.00, "Tons", "2025-10-12", "Rabi 2025", 77000.00, 22000.00],
    ["y2", "c_old_2", "Corn", "f2", 40.00, "Tons", "2025-09-15", "Kharif 2025", 68000.00, 18000.00],
    ["y3", "c_old_3", "Soybeans", "f3", 12.00, "Tons", "2025-08-30", "Kharif 2025", 49200.00, 14000.00],
    ["y4", "c_old_4", "Cotton", "f4", 18.00, "Tons", "2025-12-01", "Kharif 2025", 126000.00, 38000.00],
    ["y5", "c_old_5", "Onion", "f5", 21.00, "Tons", "2025-09-20", "Kharif 2025", 29400.00, 9000.00],
    ["y6", "c_old_6", "Rice", "f2", 9.50, "Tons", "2025-11-18", "Kharif 2025", 22800.00, 7200.00],
    ["y7", "c_old_7", "Maize", "f1", 29.00, "Tons", "2024-09-25", "Kharif 2024", 43500.00, 13000.00],
    ["y8", "c_old_8", "Wheat", "f3", 14.00, "Tons", "2024-11-30", "Rabi 2024", 30800.00, 9500.00],
    ["y9", "c_old_9", "Grapes", "f5", 8.50, "Tons", "2025-02-15", "Rabi 2025", 85000.00, 32000.00],
    ["y10", "c_old_10", "Tur", "f4", 9.00, "Tons", "2024-12-10", "Rabi 2024", 55800.00, 16000.00]
  ];
  await q("INSERT INTO yields (id,crop_id,crop_name,field_id,quantity,unit,harvest_date,season,revenue,cost) VALUES ?", [yields]);
  console.log("Yields seeded (10).");

  // 8. Seed Price Alerts with user_id
  const paArr = [
    ["alert-1", demoUserId, "Wheat", 2150.00, "above", "Maharashtra", "Pune", "Pune APMC", 1, "2026-08-25"],
    ["alert-2", demoUserId, "Onion", 1500.00, "above", "Maharashtra", "Nashik", "Lasalgaon APMC", 0, "2026-08-20"],
    ["alert-3", demoUserId, "Cotton", 7200.00, "above", "Maharashtra", "Nanded", "Nanded APMC", 1, "2026-08-22"],
    ["alert-4", demoUserId, "Soybeans", 4500.00, "above", "Maharashtra", "Latur", "Latur APMC", 0, "2026-08-18"],
    ["alert-5", demoUserId, "Rice", 2300.00, "below", "Maharashtra", "Kolhapur", "Kolhapur APMC", 0, "2026-08-10"]
  ];
  await q("INSERT INTO price_alerts (id,user_id,crop,targetPrice,alert_condition,state,district,mandi,isTriggered,dateCreated) VALUES ?", [paArr]);
  console.log("Price alerts seeded (5) linked to user " + demoUserId);

  // 9. Sensor Telemetry
  const profiles = { f1:{m:62,st:28,at:32,h:65,ph:6.8}, f2:{m:75,st:30,at:33,h:72,ph:6.2}, f3:{m:45,st:27,at:31,h:55,ph:7.1}, f4:{m:55,st:29,at:34,h:60,ph:6.5}, f5:{m:58,st:26,at:30,h:62,ph:6.9} };
  const rnd = (b, r) => parseFloat((b + (Math.random()-0.5)*r*2).toFixed(2));
  const readings = [];
  for (let day = 29; day >= 0; day--) {
    const d = new Date(); d.setDate(d.getDate() - day);
    const ts = d.toISOString().slice(0,19).replace("T"," ");
    for (const fid of ["f1","f2","f3","f4","f5"]) {
      const p = profiles[fid];
      readings.push([fid,ts,rnd(p.m,8),rnd(p.st,3),rnd(p.at,4),rnd(p.h,10),rnd(p.ph,0.4)]);
    }
  }
  await q("INSERT INTO sensor_readings (field_id,timestamp,moisture,temp_soil,temp_ambient,humidity_ambient,ph) VALUES ?", [readings]);
  console.log("Sensor readings seeded " + readings.length + " rows.");

  const now = new Date().toISOString().slice(0,19).replace("T"," ");
  const saArr = [
    ["sa1","f1","Soil Moisture","Moisture at 43 pct below threshold 50 pct. Irrigation recommended.",now],
    ["sa2","f2","Soil Temperature","Soil temp 34.2C above safe limit for rice. Check shading.",now],
    ["sa3","f3","Soil pH","pH 7.6 detected alkalinity high. Apply sulfur amendment.",now],
    ["sa4","f4","Soil Moisture","Moisture at 38 pct low for cotton boll formation stage.",now],
    ["sa5","f5","Soil Temperature","Temp spike 33C monitor onion bulb development.",now]
  ];
  await q("INSERT INTO sensor_alerts (id,field_id,alert_type,message,timestamp) VALUES ?", [saArr]);
  console.log("Sensor alerts seeded (5).");

  console.log("\nAll demo data seeded and connected with users successfully!");
  process.exit(0);
}

seed().catch(e => { console.error("Seed failed:", e.message); process.exit(1); });