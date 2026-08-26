// Indian Mandi Market Price Checker Module
class MarketPriceManager {
  constructor() {
    this.alertsKey = "farm_price_alerts";
    this.apiKeyKey = "farm_weather_api_key"; // Reuse weather API key or let them configure data.gov.in specifically
    
    // Seed initial mock market data (Comprehensive Indian Mandis)
    this.mockMandis = {
      "Maharashtra": {
        "Pune": {
          "Pune Mandi": {
            "Wheat": { min: 2100, max: 2300, modal: 2200 },
            "Rice": { min: 2250, max: 2500, modal: 2380 },
            "Soybeans": { min: 4200, max: 4600, modal: 4400 },
            "Maize": { min: 1800, max: 2100, modal: 1950 },
            "Cotton": { min: 6800, max: 7400, modal: 7100 }
          }
        },
        "Nanded": {
          "Nanded Mandi": {
            "Wheat": { min: 2050, max: 2250, modal: 2150 },
            "Rice": { min: 2150, max: 2400, modal: 2280 },
            "Soybeans": { min: 4100, max: 4500, modal: 4320 },
            "Cotton": { min: 6900, max: 7500, modal: 7250 }
          }
        }
      },
      "Punjab": {
        "Ludhiana": {
          "Ludhiana Yard": {
            "Wheat": { min: 2150, max: 2380, modal: 2275 },
            "Rice": { min: 2300, max: 2650, modal: 2480 },
            "Maize": { min: 1850, max: 2150, modal: 2000 }
          }
        },
        "Patiala": {
          "Patiala Mandi": {
            "Wheat": { min: 2120, max: 2340, modal: 2240 },
            "Rice": { min: 2200, max: 2550, modal: 2390 }
          }
        }
      },
      "Haryana": {
        "Karnal": {
          "Karnal Mandi": {
            "Wheat": { min: 2140, max: 2350, modal: 2250 },
            "Rice": { min: 2350, max: 2700, modal: 2550 }
          }
        },
        "Ambala": {
          "Ambala City": {
            "Wheat": { min: 2110, max: 2300, modal: 2210 },
            "Rice": { min: 2220, max: 2500, modal: 2360 }
          }
        }
      }
    };
  }

  getGovApiKey() {
    const settings = JSON.parse(localStorage.getItem("farm_settings")) || {};
    return settings.gov_api_key || "";
  }

  // Fetch prices based on search parameters
  async getMarketPrice(state, district, market, crop) {
    const apiKey = this.getGovApiKey();
    if (apiKey && apiKey.trim() !== "") {
      try {
        return await this.fetchFromGovAPI(state, district, market, crop, apiKey);
      } catch (e) {
        console.error("Gov API fetch failed, falling back to mock mandi database:", e);
        return this.getMockMarketPrice(state, district, market, crop);
      }
    } else {
      return this.getMockMarketPrice(state, district, market, crop);
    }
  }

  // Fetch from data.gov.in API (Variety-wise daily market prices)
  async fetchFromGovAPI(state, district, market, crop, apiKey) {
    // API endpoint for agmarknet variety daily prices
    // Filters: state, district, market, commodity (crop)
    const baseUrl = "https://api.data.gov.in/resource/9ef84281-2a12-4174-a7bf-3d572bc2178a";
    const url = `${baseUrl}?api-key=${apiKey}&format=json&limit=10&filters[state]=${encodeURIComponent(state)}&filters[district]=${encodeURIComponent(district)}&filters[market]=${encodeURIComponent(market)}&filters[commodity]=${encodeURIComponent(crop)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Gov API response error");
    }
    const data = await response.json();
    
    if (data.records && data.records.length > 0) {
      const record = data.records[0]; // grab first match
      return {
        isMock: false,
        min: parseFloat(record.min_price) || 0,
        max: parseFloat(record.max_price) || 0,
        modal: parseFloat(record.modal_price) || 0,
        unit: "Quintal",
        currency: "INR"
      };
    } else {
      throw new Error("No records found in API for selected filters");
    }
  }

  getMockMarketPrice(state, district, market, crop) {
    try {
      const price = this.mockMandis[state][district][market][crop];
      if (price) {
        return {
          isMock: true,
          min: price.min,
          max: price.max,
          modal: price.modal,
          unit: "Quintal",
          currency: "INR"
        };
      }
    } catch (e) {
      // Return default crop pricing if specific mandi combination not pre-seeded
      return this.getDefaultPrice(crop);
    }
    return this.getDefaultPrice(crop);
  }

  getDefaultPrice(crop) {
    const defaults = {
      "Wheat": { min: 2100, max: 2350, modal: 2220 },
      "Rice": { min: 2200, max: 2600, modal: 2400 },
      "Soybeans": { min: 4100, max: 4550, modal: 4350 },
      "Maize": { min: 1800, max: 2100, modal: 1950 },
      "Cotton": { min: 6800, max: 7500, modal: 7150 }
    };
    const price = defaults[crop] || { min: 1500, max: 1800, modal: 1650 };
    return {
      isMock: true,
      min: price.min,
      max: price.max,
      modal: price.modal,
      unit: "Quintal",
      currency: "INR"
    };
  }

  // Generates 30 days of price trend line data
  getHistoricalTrend(modalPrice) {
    const data = [];
    const labels = [];
    let currentPrice = modalPrice;
    
    // Generate backwards from today
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const label = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      
      // Simulate random walk (+- 1.5%)
      const change = (Math.random() - 0.5) * 0.03 * currentPrice;
      currentPrice = Math.round(currentPrice + change);

      labels.push(label);
      data.push(currentPrice);
    }

    return { labels, data };
  }

  // ---- PRICE ALERTS MANAGEMENT ----

  getAlerts() {
    return JSON.parse(localStorage.getItem(this.alertsKey)) || [];
  }

  saveAlerts(alerts) {
    localStorage.setItem(this.alertsKey, JSON.stringify(alerts));
  }

  addAlert(crop, targetPrice, condition, state, district, mandi) {
    const alerts = this.getAlerts();
    const newAlert = {
      id: "alert-" + Date.now(),
      crop,
      targetPrice: parseFloat(targetPrice),
      condition, // "above" or "below"
      state,
      district,
      mandi,
      isTriggered: false,
      dateCreated: new Date().toISOString().split("T")[0]
    };
    alerts.push(newAlert);
    this.saveAlerts(alerts);
    this.checkAlerts(); // Immediate evaluate
    return newAlert;
  }

  deleteAlert(alertId) {
    let alerts = this.getAlerts();
    alerts = alerts.filter(a => a.id !== alertId);
    this.saveAlerts(alerts);
  }

  // Checks alerts against mandi prices and tags triggers
  checkAlerts() {
    const alerts = this.getAlerts();
    let hasChanged = false;

    alerts.forEach(alert => {
      // Lookup latest modal price
      const priceInfo = this.getMockMarketPrice(alert.state, alert.district, alert.mandi, alert.crop);
      const currentModal = priceInfo.modal;

      let triggered = false;
      if (alert.condition === "above" && currentModal >= alert.targetPrice) {
        triggered = true;
      } else if (alert.condition === "below" && currentModal <= alert.targetPrice) {
        triggered = true;
      }

      if (alert.isTriggered !== triggered) {
        alert.isTriggered = triggered;
        hasChanged = true;
      }
    });

    if (hasChanged) {
      this.saveAlerts(alerts);
    }
    return alerts;
  }

  // Return live price matched for crop name (for detail links)
  getLiveCropPrice(cropName) {
    // Crop names are case-sensitive matching
    let normalized = "Wheat";
    if (cropName.toLowerCase().includes("wheat")) normalized = "Wheat";
    else if (cropName.toLowerCase().includes("rice") || cropName.toLowerCase().includes("paddy")) normalized = "Rice";
    else if (cropName.toLowerCase().includes("soy")) normalized = "Soybeans";
    else if (cropName.toLowerCase().includes("maize") || cropName.toLowerCase().includes("corn")) normalized = "Maize";
    else if (cropName.toLowerCase().includes("cotton")) normalized = "Cotton";

    // Grab default pricing in Pune Mandi for linking
    return {
      crop: normalized,
      mandi: "Pune Mandi (MH)",
      price: this.getMockMarketPrice("Maharashtra", "Pune", "Pune Mandi", normalized).modal
    };
  }
}

// Export singleton
window.marketPriceManager = new MarketPriceManager();
