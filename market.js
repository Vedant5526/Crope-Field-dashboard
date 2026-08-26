// Indian Mandi Market Price Checker Module (MySQL Backend Version)
class MarketPriceManager {
  constructor() {
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
    return (window.app && window.app.settings) ? window.app.settings.gov_api_key : "";
  }

  // Fetch prices based on search parameters
  async getMarketPrice(state, district, market, crop) {
    try {
      const url = `/api/external/mandi-price?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&market=${encodeURIComponent(market)}&crop=${encodeURIComponent(crop)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const priceInfo = await res.json();
      if (priceInfo && !priceInfo.isMock) {
        return priceInfo;
      }
      return this.getMockMarketPrice(state, district, market, crop);
    } catch (e) {
      console.warn("Backend proxy fetch failed, falling back to mock database:", e);
      return this.getMockMarketPrice(state, district, market, crop);
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

  async getAlerts() {
    try {
      const res = await fetch('/api/price-alerts');
      return await res.json();
    } catch (e) {
      console.error("Error fetching price alerts:", e);
      return [];
    }
  }

  async addAlert(crop, targetPrice, condition, state, district, mandi) {
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

    try {
      await fetch('/api/price-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert)
      });
      await this.checkAlerts(); // Immediate evaluate triggers in DB
    } catch (e) {
      console.error("Error creating price alert in DB:", e);
    }
    return newAlert;
  }

  async deleteAlert(alertId) {
    try {
      await fetch(`/api/price-alerts/${alertId}`, { method: 'DELETE' });
    } catch (e) {
      console.error("Error deleting price alert:", e);
    }
  }

  // Checks alerts against mandi prices and tags triggers in DB
  async checkAlerts() {
    const alerts = await this.getAlerts();

    for (const alert of alerts) {
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
        // Update trigger state in DB
        try {
          await fetch(`/api/price-alerts/${alert.id}/trigger`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isTriggered: triggered })
          });
        } catch (e) {
          console.error("Error updating price alert trigger state:", e);
        }
      }
    }

    // Re-fetch to return latest triggered states from DB
    return await this.getAlerts();
  }

  // Return live price matched for crop name (for detail links)
  getLiveCropPrice(cropName) {
    let normalized = "Wheat";
    if (cropName.toLowerCase().includes("wheat")) normalized = "Wheat";
    else if (cropName.toLowerCase().includes("rice") || cropName.toLowerCase().includes("paddy")) normalized = "Rice";
    else if (cropName.toLowerCase().includes("soy")) normalized = "Soybeans";
    else if (cropName.toLowerCase().includes("maize") || cropName.toLowerCase().includes("corn")) normalized = "Maize";
    else if (cropName.toLowerCase().includes("cotton")) normalized = "Cotton";

    return {
      crop: normalized,
      mandi: "Pune Mandi (MH)",
      price: this.getMockMarketPrice("Maharashtra", "Pune", "Pune Mandi", normalized).modal
    };
  }
}

// Export singleton
window.marketPriceManager = new MarketPriceManager();
