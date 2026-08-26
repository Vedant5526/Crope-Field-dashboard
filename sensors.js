// IoT Sensor Integration & Simulation Layer
class SensorManager {
  constructor() {
    this.readingsKey = "farm_sensor_readings";
    this.alertsKey = "farm_sensor_alerts";
    
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

  // Pre-seed 24 hours of hourly data for active fields
  initDatabase() {
    if (!localStorage.getItem(this.readingsKey)) {
      const readings = {};
      const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
      
      fields.forEach(field => {
        readings[field.id] = this.generate24hHistory(field.id);
      });

      localStorage.setItem(this.readingsKey, JSON.stringify(readings));
    }

    if (!localStorage.getItem(this.alertsKey)) {
      localStorage.setItem(this.alertsKey, JSON.stringify([]));
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

  // Fetches readings list
  getAllReadings() {
    return JSON.parse(localStorage.getItem(this.readingsKey)) || {};
  }

  getLatestReadings(fieldId) {
    const all = this.getAllReadings();
    const history = all[fieldId] || [];
    if (history.length > 0) {
      return history[history.length - 1];
    }
    // Return empty model fallback
    return { moisture: 0, soilTemp: 0, ambientTemp: 0, humidity: 0, ph: 7.0 };
  }

  // Fluctuate and append new values to simulate live IoT sensors reporting
  runTelemetrySimulation() {
    const allReadings = this.getAllReadings();
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    const now = new Date().toISOString();

    fields.forEach(field => {
      let history = allReadings[field.id] || [];
      if (history.length === 0) {
        history = this.generate24hHistory(field.id);
      }

      const last = history[history.length - 1];

      // Fluctuate slightly
      const moisture = Math.max(20, Math.min(98, last.moisture + (Math.random() - 0.5) * 2));
      const soilTemp = Math.max(10, Math.min(40, last.soilTemp + (Math.random() - 0.5) * 0.8));
      const ambientTemp = Math.max(10, Math.min(45, last.ambientTemp + (Math.random() - 0.5) * 1.2));
      const humidity = Math.max(15, Math.min(95, last.humidity + (Math.random() - 0.5) * 2.5));
      const ph = Math.max(4.0, Math.min(9.0, last.ph + (Math.random() - 0.5) * 0.02));

      // Append new reading
      history.push({
        timestamp: now,
        moisture: parseFloat(moisture.toFixed(1)),
        soilTemp: parseFloat(soilTemp.toFixed(1)),
        ambientTemp: parseFloat(ambientTemp.toFixed(1)),
        humidity: parseFloat(humidity.toFixed(1)),
        ph: parseFloat(ph.toFixed(2))
      });

      // Cap at last 50 entries
      if (history.length > 50) {
        history.shift();
      }

      allReadings[field.id] = history;
    });

    localStorage.setItem(this.readingsKey, JSON.stringify(allReadings));
    
    // Evaluate thresholds
    this.evaluateThresholdAlerts();
  }

  // Checks current sensor statuses against crop thresholds
  evaluateThresholdAlerts() {
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    const crops = JSON.parse(localStorage.getItem("farm_crops")) || [];
    const alerts = [];

    fields.forEach(field => {
      // Find growing crop
      const activeCrop = crops.find(c => c.field_id === field.id && c.status !== "Harvested");
      const cropName = activeCrop ? activeCrop.crop_name : "Default";
      
      // Grab thresholds rules
      const rules = this.cropThresholds[cropName] || this.cropThresholds["Default"];
      const latest = this.getLatestReadings(field.id);

      // Check Moisture
      if (latest.moisture < rules.moisture.min) {
        alerts.push({
          id: `sensor-alert-${field.id}-moisture-low`,
          fieldId: field.id,
          fieldName: field.name,
          crop: cropName,
          type: "Critical",
          message: `Low Soil Moisture in ${field.name} (${latest.moisture}%). Threshold is ${rules.moisture.min}%. Irrigation is required immediately.`
        });
      } else if (latest.moisture > rules.moisture.max) {
        alerts.push({
          id: `sensor-alert-${field.id}-moisture-high`,
          fieldId: field.id,
          fieldName: field.name,
          crop: cropName,
          type: "Warning",
          message: `High Soil Moisture in ${field.name} (${latest.moisture}%). Threshold is ${rules.moisture.max}%. High risk of waterlogging.`
        });
      }

      // Check Soil Temp
      if (latest.soilTemp < rules.soilTemp.min) {
        alerts.push({
          id: `sensor-alert-${field.id}-temp-low`,
          fieldId: field.id,
          fieldName: field.name,
          crop: cropName,
          type: "Warning",
          message: `Low Soil Temp in ${field.name} (${latest.soilTemp}°C). Optimal is ${rules.soilTemp.min}-${rules.soilTemp.max}°C.`
        });
      } else if (latest.soilTemp > rules.soilTemp.max) {
        alerts.push({
          id: `sensor-alert-${field.id}-temp-high`,
          fieldId: field.id,
          fieldName: field.name,
          crop: cropName,
          type: "Warning",
          message: `Elevated Soil Temp in ${field.name} (${latest.soilTemp}°C). Optimal is ${rules.soilTemp.min}-${rules.soilTemp.max}°C.`
        });
      }

      // Check pH
      if (latest.ph < rules.ph.min) {
        alerts.push({
          id: `sensor-alert-${field.id}-ph-low`,
          fieldId: field.id,
          fieldName: field.name,
          crop: cropName,
          type: "Warning",
          message: `Acidic Soil pH in ${field.name} (pH ${latest.ph}). Optimal for ${cropName} is pH ${rules.ph.min}-${rules.ph.max}.`
        });
      } else if (latest.ph > rules.ph.max) {
        alerts.push({
          id: `sensor-alert-${field.id}-ph-high`,
          fieldId: field.id,
          fieldName: field.name,
          crop: cropName,
          type: "Warning",
          message: `Alkaline Soil pH in ${field.name} (pH ${latest.ph}). Optimal for ${cropName} is pH ${rules.ph.min}-${rules.ph.max}.`
        });
      }
    });

    localStorage.setItem(this.alertsKey, JSON.stringify(alerts));
  }

  // Returns alerts list
  getSensorAlerts() {
    return JSON.parse(localStorage.getItem(this.alertsKey)) || [];
  }

  // Helper to determine Sparkline trend indicator based on last 5 readings
  getTrendIndicator(fieldId, metric) {
    const all = this.getAllReadings();
    const history = all[fieldId] || [];
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
window.sensorManager.initDatabase();
