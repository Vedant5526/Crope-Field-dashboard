// IoT Sensor Integration & Simulation Layer (MySQL Connected Version)
class SensorManager {
  constructor() {
    this.cachedReadings = {};
    this.cachedAlerts = [];
    
    // Threshold envelopes per crop type
    this.cropThresholds = {
      "Wheat": {
        moisture: { min: 40, max: 60, name: "Soil Moisture", unit: "%" },
        soilTemp: { min: 15, max: 25, name: "Soil Temperature", unit: "°C" },
        ph: { min: 6.0, max: 7.0, name: "Soil pH", unit: "" }
      },
      "Rice": {
        moisture: { min: 60, max: 80, name: "Soil Moisture", unit: "%" },
        soilTemp: { min: 20, max: 30, name: "Soil Temperature", unit: "°C" },
        ph: { min: 5.5, max: 6.5, name: "Soil pH", unit: "" }
      },
      "Soybeans": {
        moisture: { min: 45, max: 65, name: "Soil Moisture", unit: "%" },
        soilTemp: { min: 18, max: 26, name: "Soil Temperature", unit: "°C" },
        ph: { min: 6.0, max: 7.5, name: "Soil pH", unit: "" }
      },
      "Default": {
        moisture: { min: 35, max: 70, name: "Soil Moisture", unit: "%" },
        soilTemp: { min: 15, max: 32, name: "Soil Temperature", unit: "°C" },
        ph: { min: 5.5, max: 7.5, name: "Soil pH", unit: "" }
      }
    };
  }

  // Fetch all sensor readings and alerts from backend to populate cache
  async fetchData() {
    try {
      // 1. Fetch readings
      const resReadings = await fetch('/api/sensor-readings');
      const readings = await resReadings.json();
      
      const grouped = {};
      readings.forEach(r => {
        if (!grouped[r.field_id]) grouped[r.field_id] = [];
        grouped[r.field_id].push({
          timestamp: r.timestamp,
          moisture: parseFloat(r.moisture),
          soilTemp: parseFloat(r.temp_soil),
          ambientTemp: parseFloat(r.temp_ambient),
          humidity: parseFloat(r.humidity_ambient),
          ph: parseFloat(r.ph)
        });
      });
      this.cachedReadings = grouped;

      // 2. Fetch alerts
      const resAlerts = await fetch('/api/sensor-alerts');
      const alerts = await resAlerts.json();
      this.cachedAlerts = alerts.map(a => ({
        id: a.id,
        fieldId: a.field_id,
        fieldName: a.fieldName || 'Field Block', // filled dynamically or resolved
        crop: a.crop || 'Crop',
        type: a.type, // 'Critical' or 'Warning'
        message: a.message
      }));

    } catch (e) {
      console.error("Failed to fetch sensor data from API:", e);
    }
  }

  // Pre-seed 24 hours of hourly data for active fields if MySQL database is empty
  async initDatabase() {
    await this.fetchData();

    if (Object.keys(this.cachedReadings).length === 0) {
      console.log("MySQL sensor_readings table is empty. Generating 24h mock seed history...");
      try {
        const fieldsRes = await fetch('/api/fields');
        const fields = await fieldsRes.json();
        
        for (const field of fields) {
          const history = this.generate24hHistory(field.id);
          for (const item of history) {
            await fetch('/api/sensor-readings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                field_id: field.id,
                timestamp: item.timestamp.replace('T', ' ').substring(0, 19),
                moisture: item.moisture,
                temp_soil: item.soilTemp,
                temp_ambient: item.ambientTemp,
                humidity_ambient: item.humidity,
                ph: item.ph
              })
            });
          }
        }
        // Repopulate cache
        await this.fetchData();
      } catch (e) {
        console.error("Failed to seed initial sensor readings:", e);
      }
    }
  }

  // Generate simulated 24h history records
  generate24hHistory(fieldId) {
    const history = [];
    const now = new Date();
    
    // Seed parameters depending on field index for diversity
    const seed = fieldId === "f1" ? 1 : fieldId === "f2" ? 2 : 3;
    let moisture = 45 + (seed * 8); // e.g. f1=53%, f2=61%, f3=69%
    let soilTemp = 18 + seed;       // e.g. f1=19, f2=20, f3=21
    let ambientTemp = 24 + seed;
    let humidity = 65 + (seed * 4);
    let ph = 6.2 + (seed * 0.2);     // e.g. f1=6.4, f2=6.6, f3=6.8

    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      // Add random walks
      moisture = Math.max(20, Math.min(100, moisture + (Math.random() - 0.5) * 3));
      soilTemp = Math.max(5, Math.min(45, soilTemp + (Math.random() - 0.5) * 1));
      ambientTemp = Math.max(10, Math.min(48, ambientTemp + (Math.random() - 0.5) * 1.5));
      humidity = Math.max(10, Math.min(100, humidity + (Math.random() - 0.5) * 4));
      ph = Math.max(3.5, Math.min(9.5, ph + (Math.random() - 0.5) * 0.05));

      history.push({
        timestamp: timestamp.toISOString(),
        moisture: parseFloat(moisture.toFixed(1)),
        soilTemp: parseFloat(soilTemp.toFixed(1)),
        ambientTemp: parseFloat(ambientTemp.toFixed(1)),
        humidity: parseFloat(humidity.toFixed(1)),
        ph: parseFloat(ph.toFixed(2))
      });
    }
    return history;
  }

  // Returns cache readings (synchronous to preserve frontend architecture compatibility)
  getAllReadings() {
    return this.cachedReadings;
  }

  getLatestReadings(fieldId) {
    const history = this.cachedReadings[fieldId] || [];
    if (history.length > 0) {
      return history[history.length - 1];
    }
    return { moisture: 0, soilTemp: 0, ambientTemp: 0, humidity: 0, ph: 7.0 };
  }

  // Fluctuate and append new values to simulate live IoT sensors reporting
  async runTelemetrySimulation() {
    try {
      const fieldsRes = await fetch('/api/fields');
      const fields = await fieldsRes.json();
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

      for (const field of fields) {
        const history = this.cachedReadings[field.id] || [];
        const last = history.length > 0 
          ? history[history.length - 1] 
          : { moisture: 50, soilTemp: 22, ambientTemp: 26, humidity: 60, ph: 6.8 };

        // Fluctuate slightly
        const moisture = Math.max(20, Math.min(98, last.moisture + (Math.random() - 0.5) * 2));
        const soilTemp = Math.max(10, Math.min(40, last.soilTemp + (Math.random() - 0.5) * 0.8));
        const ambientTemp = Math.max(10, Math.min(45, last.ambientTemp + (Math.random() - 0.5) * 1.2));
        const humidity = Math.max(15, Math.min(95, last.humidity + (Math.random() - 0.5) * 2.5));
        const ph = Math.max(4.0, Math.min(9.0, last.ph + (Math.random() - 0.5) * 0.02));

        // Post new reading to MySQL database
        await fetch('/api/sensor-readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field_id: field.id,
            timestamp: nowStr,
            moisture: parseFloat(moisture.toFixed(1)),
            temp_soil: parseFloat(soilTemp.toFixed(1)),
            temp_ambient: parseFloat(ambientTemp.toFixed(1)),
            humidity_ambient: parseFloat(humidity.toFixed(1)),
            ph: parseFloat(ph.toFixed(2))
          })
        });
      }

      // Re-fetch and evaluate
      await this.fetchData();
      await this.evaluateThresholdAlerts();
    } catch (e) {
      console.error("Telemetry simulation tick error:", e);
    }
  }

  // Checks current sensor statuses against crop thresholds
  async evaluateThresholdAlerts() {
    try {
      const fieldsRes = await fetch('/api/fields');
      const fields = await fieldsRes.json();
      const cropsRes = await fetch('/api/crops');
      const crops = await cropsRes.json();
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // Clear existing sensor alerts in DB
      await fetch('/api/sensor-alerts', { method: 'DELETE' });

      for (const field of fields) {
        // Find growing crop
        const activeCrop = crops.find(c => c.field_id === field.id && c.status !== "Harvested");
        const cropName = activeCrop ? activeCrop.crop_name : "Default";
        
        // Grab thresholds rules
        const rules = this.cropThresholds[cropName] || this.cropThresholds["Default"];
        const latest = this.getLatestReadings(field.id);

        // Check Moisture
        if (latest.moisture < rules.moisture.min) {
          await this.saveAlert({
            id: `sensor-alert-${field.id}-moisture-low`,
            field_id: field.id,
            type: "Critical",
            message: `Low Soil Moisture in ${field.name} (${latest.moisture}%). Threshold is ${rules.moisture.min}%. Irrigation is required immediately.`,
            timestamp: nowStr
          });
        } else if (latest.moisture > rules.moisture.max) {
          await this.saveAlert({
            id: `sensor-alert-${field.id}-moisture-high`,
            field_id: field.id,
            type: "Warning",
            message: `High Soil Moisture in ${field.name} (${latest.moisture}%). Threshold is ${rules.moisture.max}%. High risk of waterlogging.`,
            timestamp: nowStr
          });
        }

        // Check Soil Temp
        if (latest.soilTemp < rules.soilTemp.min) {
          await this.saveAlert({
            id: `sensor-alert-${field.id}-temp-low`,
            field_id: field.id,
            type: "Warning",
            message: `Low Soil Temp in ${field.name} (${latest.soilTemp}°C). Optimal is ${rules.soilTemp.min}-${rules.soilTemp.max}°C.`,
            timestamp: nowStr
          });
        } else if (latest.soilTemp > rules.soilTemp.max) {
          await this.saveAlert({
            id: `sensor-alert-${field.id}-temp-high`,
            field_id: field.id,
            type: "Warning",
            message: `Elevated Soil Temp in ${field.name} (${latest.soilTemp}°C). Optimal is ${rules.soilTemp.min}-${rules.soilTemp.max}°C.`,
            timestamp: nowStr
          });
        }

        // Check pH
        if (latest.ph < rules.ph.min) {
          await this.saveAlert({
            id: `sensor-alert-${field.id}-ph-low`,
            field_id: field.id,
            type: "Warning",
            message: `Acidic Soil pH in ${field.name} (pH ${latest.ph}). Optimal for ${cropName} is pH ${rules.ph.min}-${rules.ph.max}.`,
            timestamp: nowStr
          });
        } else if (latest.ph > rules.ph.max) {
          await this.saveAlert({
            id: `sensor-alert-${field.id}-ph-high`,
            field_id: field.id,
            type: "Warning",
            message: `Alkaline Soil pH in ${field.name} (pH ${latest.ph}). Optimal for ${cropName} is pH ${rules.ph.min}-${rules.ph.max}.`,
            timestamp: nowStr
          });
        }
      }

      // Re-populate cache to load newest alerts
      await this.fetchData();
    } catch (e) {
      console.error("Error evaluating threshold alerts:", e);
    }
  }

  // Helper to post active alert
  async saveAlert(alert) {
    try {
      await fetch('/api/sensor-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });
    } catch (e) {
      console.error("Error saving alert to DB:", e);
    }
  }

  // Returns alerts list
  getSensorAlerts() {
    return this.cachedAlerts;
  }

  // Helper to determine Sparkline trend indicator based on last 5 readings
  getTrendIndicator(fieldId, metric) {
    const history = this.cachedReadings[fieldId] || [];
    if (history.length < 5) return "→";

    const last5 = history.slice(-5);
    const startValue = last5[0][metric];
    const endValue = last5[4][metric];
    const diff = endValue - startValue;

    // Small threshold to declare stability
    const stabilityThreshold = metric === "ph" ? 0.05 : 1.0;

    if (diff > stabilityThreshold) return "↗"; // Rising
    if (diff < -stabilityThreshold) return "↘"; // Falling
    return "→"; // Stable
  }

  // Gets health status status color based on active warnings
  getFieldSensorStatus(fieldId) {
    const alerts = this.getSensorAlerts();
    const fieldAlerts = alerts.filter(a => a.fieldId === fieldId);
    
    if (fieldAlerts.some(a => a.type === "Critical")) {
      return "Critical"; // Red
    }
    if (fieldAlerts.length > 0) {
      return "Warning"; // Amber
    }
    return "Optimal"; // Green
  }
}

// Export singleton
window.sensorManager = new SensorManager();
