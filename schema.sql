-- MySQL Database Schema for Crop & Field Management Dashboard
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS crop_field_dashboard;
USE crop_field_dashboard;

-- 1. USERS Table (Authentication & User Management)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(30) DEFAULT 'Farmer',   -- 'Farmer' | 'Admin' | 'Viewer'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- 2. SETTINGS Table (User Preferences & Configurations)
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  role VARCHAR(50) DEFAULT 'Farmer',
  weather_api_key VARCHAR(100) DEFAULT '',
  gov_api_key VARCHAR(100) DEFAULT '',
  unit_preference VARCHAR(20) DEFAULT 'Metric',
  weather_lat DECIMAL(9,6) DEFAULT 18.5204,
  weather_lng DECIMAL(9,6) DEFAULT 73.8567,
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. FIELDS Table (Registered lands belonging to a user)
CREATE TABLE IF NOT EXISTS fields (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT,
  name VARCHAR(100) NOT NULL,
  area DECIMAL(10,2) NOT NULL,
  soil_type VARCHAR(50) NOT NULL,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  coordinates JSON,
  CONSTRAINT fk_fields_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. FIELD HISTORY Table (Past crop rotations)
CREATE TABLE IF NOT EXISTS field_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_id VARCHAR(50),
  history_date DATE NOT NULL,
  crop VARCHAR(50) NOT NULL,
  yield_amount VARCHAR(50) NOT NULL,
  notes TEXT,
  CONSTRAINT fk_history_field FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
);

-- 5. CROPS Table (Current cultivations)
CREATE TABLE IF NOT EXISTS crops (
  id VARCHAR(50) PRIMARY KEY,
  field_id VARCHAR(50),
  crop_name VARCHAR(50) NOT NULL,
  variety VARCHAR(100),
  sowing_date DATE NOT NULL,
  harvest_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Sown',
  notes TEXT,
  CONSTRAINT fk_crops_field FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE SET NULL
);

-- 6. YIELDS Table (Harvest records)
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
  CONSTRAINT fk_yields_field FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE SET NULL
);

-- 7. PRICE ALERTS Table (Mandi rate trackers for a user)
CREATE TABLE IF NOT EXISTS price_alerts (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT,
  crop VARCHAR(50) NOT NULL,
  targetPrice DECIMAL(10,2) NOT NULL,
  alert_condition VARCHAR(10) NOT NULL DEFAULT 'above', -- 'above' or 'below'
  state VARCHAR(50) NOT NULL,
  district VARCHAR(50) NOT NULL,
  mandi VARCHAR(100) NOT NULL,
  isTriggered BOOLEAN DEFAULT FALSE,
  dateCreated DATE NOT NULL,
  CONSTRAINT fk_alerts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. SENSOR READINGS Table (IoT historical records)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_id VARCHAR(50) NOT NULL,
  timestamp DATETIME NOT NULL,
  moisture DECIMAL(5,2) NOT NULL,
  temp_soil DECIMAL(5,2) NOT NULL,
  temp_ambient DECIMAL(5,2) NOT NULL,
  humidity_ambient DECIMAL(5,2) NOT NULL,
  ph DECIMAL(4,2) NOT NULL,
  CONSTRAINT fk_readings_field FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
);

-- 9. SENSOR ALERTS Table (Active IoT alerts)
CREATE TABLE IF NOT EXISTS sensor_alerts (
  id VARCHAR(50) PRIMARY KEY,
  field_id VARCHAR(50) NOT NULL,
  alert_type VARCHAR(50) NOT NULL, -- 'Soil Moisture', 'Soil Temperature', 'Soil pH'
  message TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  CONSTRAINT fk_sensor_alerts_field FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
);
