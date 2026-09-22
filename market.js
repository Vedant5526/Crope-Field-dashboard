// Indian Mandi Market Price Checker Module (MySQL Backend Version)
class MarketPriceManager {
  constructor() {
    // Comprehensive Maharashtra APMC Mandi Data (real districts & yards, realistic prices)
    this.mockMandis = {
      "Maharashtra": {
        "Pune": {
          "Pune APMC": {
            "Wheat": { min: 2100, max: 2300, modal: 2200 },
            "Rice": { min: 2250, max: 2500, modal: 2380 },
            "Soybeans": { min: 4200, max: 4600, modal: 4400 },
            "Maize": { min: 1800, max: 2100, modal: 1950 },
            "Cotton": { min: 6800, max: 7400, modal: 7100 },
            "Onion": { min: 800, max: 1600, modal: 1200 }
          }
        },
        "Nashik": {
          "Lasalgaon APMC": {
            "Onion": { min: 600, max: 2200, modal: 1400 },
            "Wheat": { min: 2050, max: 2280, modal: 2160 },
            "Maize": { min: 1750, max: 2000, modal: 1870 },
            "Soybeans": { min: 4050, max: 4500, modal: 4250 },
            "Tomato": { min: 400, max: 1800, modal: 900 }
          },
          "Nashik APMC": {
            "Onion": { min: 700, max: 2100, modal: 1350 },
            "Wheat": { min: 2080, max: 2290, modal: 2190 },
            "Rice": { min: 2200, max: 2450, modal: 2310 },
            "Maize": { min: 1760, max: 2010, modal: 1880 },
            "Grapes": { min: 3500, max: 8000, modal: 5500 }
          },
          "Niphad APMC": {
            "Onion": { min: 650, max: 2000, modal: 1300 },
            "Wheat": { min: 2000, max: 2250, modal: 2120 },
            "Grapes": { min: 3800, max: 8500, modal: 6000 }
          }
        },
        "Nanded": {
          "Nanded APMC": {
            "Wheat": { min: 2050, max: 2250, modal: 2150 },
            "Rice": { min: 2150, max: 2400, modal: 2280 },
            "Soybeans": { min: 4100, max: 4500, modal: 4320 },
            "Cotton": { min: 6900, max: 7500, modal: 7250 },
            "Maize": { min: 1700, max: 2050, modal: 1870 }
          },
          "Dharmabad APMC": {
            "Soybeans": { min: 4000, max: 4450, modal: 4200 },
            "Cotton": { min: 6800, max: 7450, modal: 7100 },
            "Wheat": { min: 2000, max: 2200, modal: 2100 }
          }
        },
        "Aurangabad": {
          "Aurangabad APMC": {
            "Wheat": { min: 2020, max: 2250, modal: 2140 },
            "Soybeans": { min: 4080, max: 4480, modal: 4280 },
            "Cotton": { min: 6750, max: 7350, modal: 7050 },
            "Onion": { min: 750, max: 1700, modal: 1200 },
            "Maize": { min: 1680, max: 2000, modal: 1840 }
          },
          "Paithan APMC": {
            "Soybeans": { min: 3980, max: 4420, modal: 4200 },
            "Cotton": { min: 6700, max: 7300, modal: 7000 }
          }
        },
        "Latur": {
          "Latur APMC": {
            "Soybeans": { min: 4050, max: 4500, modal: 4280 },
            "Tur (Pigeon Peas)": { min: 5500, max: 7000, modal: 6200 },
            "Cotton": { min: 6850, max: 7500, modal: 7200 },
            "Wheat": { min: 2010, max: 2220, modal: 2110 },
            "Onion": { min: 700, max: 1600, modal: 1150 }
          },
          "Ahmedpur APMC": {
            "Soybeans": { min: 4000, max: 4480, modal: 4240 },
            "Tur (Pigeon Peas)": { min: 5400, max: 6900, modal: 6100 }
          }
        },
        "Ahmednagar": {
          "Rahuri APMC": {
            "Onion": { min: 600, max: 1900, modal: 1200 },
            "Wheat": { min: 2000, max: 2230, modal: 2100 },
            "Maize": { min: 1650, max: 1980, modal: 1820 }
          },
          "Sangamner APMC": {
            "Onion": { min: 550, max: 1850, modal: 1150 },
            "Wheat": { min: 1980, max: 2200, modal: 2080 },
            "Soybeans": { min: 4000, max: 4450, modal: 4200 }
          }
        },
        "Solapur": {
          "Solapur APMC": {
            "Tur (Pigeon Peas)": { min: 5600, max: 7200, modal: 6400 },
            "Wheat": { min: 2030, max: 2240, modal: 2130 },
            "Soybeans": { min: 4100, max: 4520, modal: 4310 },
            "Cotton": { min: 6780, max: 7380, modal: 7080 },
            "Onion": { min: 720, max: 1700, modal: 1200 }
          },
          "Barshi APMC": {
            "Tur (Pigeon Peas)": { min: 5500, max: 7100, modal: 6300 },
            "Soybeans": { min: 4050, max: 4500, modal: 4260 }
          }
        },
        "Kolhapur": {
          "Kolhapur APMC": {
            "Rice": { min: 2200, max: 2550, modal: 2360 },
            "Soybeans": { min: 4100, max: 4550, modal: 4320 },
            "Maize": { min: 1750, max: 2050, modal: 1900 },
            "Sugarcane": { min: 280, max: 310, modal: 295 }
          }
        },
        "Satara": {
          "Satara APMC": {
            "Wheat": { min: 2050, max: 2280, modal: 2160 },
            "Soybeans": { min: 4080, max: 4480, modal: 4270 },
            "Maize": { min: 1700, max: 2030, modal: 1850 },
            "Onion": { min: 680, max: 1650, modal: 1150 }
          }
        },
        "Sangli": {
          "Sangli APMC": {
            "Tur (Pigeon Peas)": { min: 5500, max: 7100, modal: 6200 },
            "Soybeans": { min: 4050, max: 4480, modal: 4250 },
            "Onion": { min: 650, max: 1700, modal: 1200 },
            "Turmeric": { min: 6000, max: 9000, modal: 7500 }
          }
        },
        "Akola": {
          "Akola APMC": {
            "Cotton": { min: 6700, max: 7400, modal: 7050 },
            "Soybeans": { min: 4000, max: 4450, modal: 4220 },
            "Wheat": { min: 2000, max: 2220, modal: 2100 },
            "Tur (Pigeon Peas)": { min: 5400, max: 6900, modal: 6100 }
          }
        },
        "Amravati": {
          "Amravati APMC": {
            "Cotton": { min: 6750, max: 7450, modal: 7100 },
            "Soybeans": { min: 4050, max: 4500, modal: 4270 },
            "Wheat": { min: 2010, max: 2230, modal: 2110 },
            "Tur (Pigeon Peas)": { min: 5450, max: 7000, modal: 6200 }
          }
        },
        "Nagpur": {
          "Nagpur APMC": {
            "Cotton": { min: 6750, max: 7450, modal: 7100 },
            "Soybeans": { min: 4080, max: 4500, modal: 4270 },
            "Wheat": { min: 2030, max: 2250, modal: 2130 },
            "Rice": { min: 2200, max: 2480, modal: 2340 },
            "Maize": { min: 1750, max: 2050, modal: 1900 }
          },
          "Wardha APMC": {
            "Cotton": { min: 6700, max: 7400, modal: 7050 },
            "Soybeans": { min: 4000, max: 4460, modal: 4220 }
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
      "Cotton": { min: 6800, max: 7500, modal: 7150 },
      "Onion": { min: 600, max: 2200, modal: 1400 },
      "Tur (Pigeon Peas)": { min: 5500, max: 7200, modal: 6200 },
      "Tomato": { min: 400, max: 1800, modal: 900 },
      "Grapes": { min: 3500, max: 8500, modal: 5800 },
      "Turmeric": { min: 6000, max: 9000, modal: 7500 },
      "Sugarcane": { min: 280, max: 310, modal: 295 }
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
      const res = await (window.apiFetch || fetch)('/api/price-alerts');
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
      await (window.apiFetch || fetch)('/api/price-alerts', {
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
      await (window.apiFetch || fetch)(`/api/price-alerts/${alertId}`, { method: 'DELETE' });
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
          await (window.apiFetch || fetch)(`/api/price-alerts/${alert.id}/trigger`, {
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
