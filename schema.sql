-- MySQL Database Schema for Crop & Field Management Dashboard
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS crop_field_dashboard;
USE crop_field_dashboard;

-- 1. SETTINGS Table
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(50) DEFAULT 'Farmer',
  weather_api_key VARCHAR(100) DEFAULT '',
  gov_api_key VARCHAR(100) DEFAULT '',
  unit_preference VARCHAR(20) DEFAULT 'Metric',
  weather_lat DECIMAL(9,6) DEFAULT 18.5204,
  weather_lng DECIMAL(9,6) DEFAULT 73.8567
);

-- 2. FIELDS Table
CREATE TABLE IF NOT EXISTS fields (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  area DECIMAL(10,2) NOT NULL,
  soil_type VARCHAR(50) NOT NULL,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  coordinates JSON
);

-- 3. FIELD HISTORY Table (Past crop rotations)
CREATE TABLE IF NOT EXISTS field_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_id VARCHAR(50),
  history_date DATE NOT NULL,
  crop VARCHAR(50) NOT NULL,
  yield_amount VARCHAR(50) NOT NULL,
  notes TEXT,
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
);

-- 4. CROPS Table (Current cultivations)
CREATE TABLE IF NOT EXISTS crops (
  id VARCHAR(50) PRIMARY KEY,
  field_id VARCHAR(50),
  crop_name VARCHAR(50) NOT NULL,
  variety VARCHAR(100),
  sowing_date DATE NOT NULL,
  harvest_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Sown',
  notes TEXT,
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE SET NULL
);

-- 5. YIELDS Table (Harvest records)
CREATE TABLE IF NOT EXISTS yields (
  id VARCHAR(50) PRIMARY KEY,
  crop_id VARCHAR(50),
  crop_name VARCHAR(50) NOT NULL,
  field_id VARCHAR(50),
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'Tons',
  harvest_date DATE NOT NULL,
  season VARCHAR(50) NOT NULL,
  revenue DECIMAL(12,2) NOT NULL,
  cost DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE SET NULL
);

-- 6. PRICE ALERTS Table (Mandi rate trackers)
CREATE TABLE IF NOT EXISTS price_alerts (
  id VARCHAR(50) PRIMARY KEY,
  crop VARCHAR(50) NOT NULL,
  targetPrice DECIMAL(10,2) NOT NULL,
  alert_condition VARCHAR(10) NOT NULL DEFAULT 'above', -- 'above' or 'below'
  state VARCHAR(50) NOT NULL,
  district VARCHAR(50) NOT NULL,
  mandi VARCHAR(100) NOT NULL,
  isTriggered BOOLEAN DEFAULT FALSE,
  dateCreated DATE NOT NULL
);

-- 7. SENSOR READINGS Table (IoT historical records)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_id VARCHAR(50) NOT NULL,
  timestamp DATETIME NOT NULL,
  moisture DECIMAL(5,2) NOT NULL,
  temp_soil DECIMAL(5,2) NOT NULL,
  temp_ambient DECIMAL(5,2) NOT NULL,
  humidity_ambient DECIMAL(5,2) NOT NULL,
  ph DECIMAL(4,2) NOT NULL,
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
);

-- 8. SENSOR ALERTS Table (Active IoT alerts)
CREATE TABLE IF NOT EXISTS sensor_alerts (
  id VARCHAR(50) PRIMARY KEY,
  field_id VARCHAR(50) NOT NULL,
  alert_type VARCHAR(50) NOT NULL, -- 'Soil Moisture', 'Soil Temperature', 'Soil pH'
  message TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
);

-- ==============================================
-- SEED INITIAL MOCK DATA
-- ==============================================

-- Empty tables before seeding
DELETE FROM sensor_alerts;
DELETE FROM sensor_readings;
DELETE FROM price_alerts;
DELETE FROM yields;
DELETE FROM crops;
DELETE FROM field_history;
DELETE FROM fields;
DELETE FROM settings;

-- Seed Settings
INSERT INTO settings (id, role, weather_api_key, gov_api_key, unit_preference, weather_lat, weather_lng)
VALUES (1, 'Farmer', '', '', 'Metric', 18.5204, 73.8567);

-- Seed Fields
INSERT INTO fields (id, name, area, soil_type, lat, lng, coordinates)
VALUES 
('f1', 'North Meadow', 12.5, 'Loam', 18.5254, 73.8587, '[[18.5270, 73.8570], [18.5270, 73.8604], [18.5238, 73.8604], [18.5238, 73.8570]]'),
('f2', 'East Riverfront', 8.2, 'Clay Loam', 18.5190, 73.8710, '[[18.5210, 73.8690], [18.5210, 73.8730], [18.5170, 73.8730], [18.5170, 73.8690]]'),
('f3', 'Hillside Slopes', 5.4, 'Sandy Loam', 18.5080, 73.8480, '[[18.5100, 73.8460], [18.5100, 73.8500], [18.5060, 73.8500], [18.5060, 73.8460]]');

-- Seed Field Histories
INSERT INTO field_history (field_id, history_date, crop, yield_amount, notes)
VALUES
('f1', '2025-05-10', 'Corn', '45 Tons', 'Good harvest, slight nitrogen depletion.'),
('f1', '2024-11-12', 'Wheat', '38 Tons', 'Normal soil moisture, minor pest attack handled.'),
('f2', '2025-04-15', 'Rice', '32 Tons', 'High water consumption due to clay content.'),
('f3', '2025-03-20', 'Soybean', '15 Tons', 'Slight soil erosion detected on north slope.');

-- Seed Crops
INSERT INTO crops (id, field_id, crop_name, variety, sowing_date, harvest_date, status, notes)
VALUES
('c1', 'f1', 'Wheat', 'HD-2967 High Yield', '2026-06-15', '2026-10-15', 'Flowering', 'Sown early, healthy green leaves. Crop needs nitrogen check.'),
('c2', 'f2', 'Rice', 'Basmati-370', '2026-07-01', '2026-11-15', 'Vegetative', 'Irrigation running daily. Good growth stage.'),
('c3', 'f3', 'Soybeans', 'JS 335', '2026-05-10', '2026-09-10', 'Ready for Harvest', 'Pods filled nicely. Harvest scheduled next week.');

-- Seed Yields
INSERT INTO yields (id, crop_id, crop_name, field_id, quantity, unit, harvest_date, season, revenue, cost)
VALUES
('y1', 'c_old_1', 'Wheat', 'f1', 35.00, 'Tons', '2025-10-12', 'Rabi 2025', 7200.00, 2200.00),
('y2', 'c_old_2', 'Corn', 'f2', 40.00, 'Tons', '2025-09-15', 'Kharif 2025', 6800.00, 1800.00),
('y3', 'c_old_3', 'Soybeans', 'f3', 12.00, 'Tons', '2025-08-30', 'Kharif 2025', 4100.00, 1100.00);

-- Seed Price Alerts
INSERT INTO price_alerts (id, crop, targetPrice, alert_condition, state, district, mandi, isTriggered, dateCreated)
VALUES
('alert-1', 'Wheat', 2150.00, 'above', 'Maharashtra', 'Pune', 'Pune Mandi', TRUE, '2026-08-25');
