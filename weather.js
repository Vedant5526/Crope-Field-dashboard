// Weather API Integration and Simulator
class WeatherManager {
  constructor() {
    this.apiKeyKey = "farm_weather_api_key";
    this.weatherDataCache = null;
  }

  getApiKey() {
    const settings = JSON.parse(localStorage.getItem("farm_settings")) || {};
    return settings.weather_api_key || "";
  }

  // Returns weather data (API-fetched or mock) for given coordinates
  async getWeather(lat, lng) {
    const apiKey = this.getApiKey();
    if (apiKey && apiKey.trim() !== "") {
      try {
        return await this.fetchFromOpenWeather(lat, lng, apiKey);
      } catch (error) {
        console.error("Failed to fetch weather from API, falling back to simulator:", error);
        return this.getMockWeather(lat, lng);
      }
    } else {
      return this.getMockWeather(lat, lng);
    }
  }

  async fetchFromOpenWeather(lat, lng, key) {
    // OpenWeatherMap free tier current + 5-day forecast
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${key}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${key}&units=metric`;

    const [currentRes, forecastRes] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl)
    ]);

    if (!currentRes.ok || !forecastRes.ok) {
      throw new Error("OpenWeatherMap request failed");
    }

    const currentData = await currentRes.json();
    const forecastData = await forecastRes.json();

    // Map response to our format
    const weather = {
      isMock: false,
      location: currentData.name || "My Farm Location",
      temp: Math.round(currentData.main.temp),
      humidity: currentData.main.humidity,
      windSpeed: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
      forecast: []
    };

    // Filter forecast for one reading per day (e.g., at 12:00 PM)
    const dailyForecasts = forecastData.list.filter(item => item.dt_txt.includes("12:00:00"));
    weather.forecast = dailyForecasts.slice(0, 3).map(item => {
      const date = new Date(item.dt * 1000);
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      return {
        day: dayName,
        temp: Math.round(item.main.temp),
        icon: item.weather[0].icon,
        desc: item.weather[0].main
      };
    });

    // Determine alerts based on API weather (e.g. rain, heat)
    weather.alerts = [];
    if (currentData.main.temp > 38) {
      weather.alerts.push({
        type: "danger",
        title: "Extreme Heat Risk",
        message: "Temperature exceeds 38°C. Ensure adequate irrigation for all active crops."
      });
    }
    if (currentData.weather[0].main.toLowerCase().includes("rain") || currentData.weather[0].main.toLowerCase().includes("drizzle")) {
      weather.alerts.push({
        type: "info",
        title: "Rainfall Detected",
        message: "Rain is falling. You may delay scheduled irrigation to save water."
      });
    }

    return weather;
  }

  getMockWeather(lat, lng) {
    // Generate intelligent mock weather based on month of the year
    const today = new Date();
    const month = today.getMonth(); // 0 = Jan, 7 = Aug
    
    let baseTemp = 28;
    let humidity = 60;
    let desc = "Partly Cloudy";
    let iconClass = "fa-cloud-sun";
    let forecast = [];
    let alerts = [];

    // Monsoon season in Pune/India (June - Sept)
    if (month >= 5 && month <= 8) {
      baseTemp = 27;
      humidity = 85;
      desc = "Moderate Rain / Monsoon Showers";
      iconClass = "fa-cloud-showers-heavy";
      
      forecast = [
        { day: "Wed", temp: 26, icon: "fa-cloud-rain", desc: "Showers" },
        { day: "Thu", temp: 28, icon: "fa-cloud-sun", desc: "Scattered" },
        { day: "Fri", temp: 25, icon: "fa-cloud-showers-heavy", desc: "Heavy Rain" }
      ];

      alerts.push({
        type: "warning",
        title: "High Humidity (Pest Risk)",
        message: "Humidity is 85%. High risk of fungal leaf rust in Wheat/Rice. Check pesticide schedules."
      });
      alerts.push({
        type: "info",
        title: "Irrigation Delay",
        message: "Monsoon rainfall active. Save irrigation costs: water pumps can remain offline."
      });
    } 
    // Winter (Oct - Feb)
    else if (month >= 9 || month <= 1) {
      baseTemp = 22;
      humidity = 45;
      desc = "Sunny and Cool";
      iconClass = "fa-sun";

      forecast = [
        { day: "Wed", temp: 22, icon: "fa-sun", desc: "Clear" },
        { day: "Thu", temp: 23, icon: "fa-sun", desc: "Clear" },
        { day: "Fri", temp: 21, icon: "fa-cloud", desc: "Cloudy" }
      ];

      alerts.push({
        type: "warning",
        title: "Dew Alert",
        message: "Cool morning dew predicted. Watch out for mildew onset on vegetables."
      });
    }
    // Summer (March - May)
    else {
      baseTemp = 37;
      humidity = 30;
      desc = "Hot and Dry";
      iconClass = "fa-sun-dust";

      forecast = [
        { day: "Wed", temp: 38, icon: "fa-sun", desc: "Hot" },
        { day: "Thu", temp: 39, icon: "fa-sun", desc: "Hot" },
        { day: "Fri", temp: 36, icon: "fa-cloud-sun", desc: "Windy" }
      ];

      alerts.push({
        type: "danger",
        title: "High Evapotranspiration",
        message: "Summer peak at 37°C. Crops require extra irrigation cycles. Check soil moisture."
      });
    }

    return {
      isMock: true,
      location: `Farm Block (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`,
      temp: baseTemp,
      humidity: humidity,
      windSpeed: 14,
      description: desc,
      iconClass: iconClass,
      forecast: forecast,
      alerts: alerts
    };
  }

  // Renders the weather details inside index.html elements
  async updateWeatherUI(lat, lng) {
    const weatherContainer = document.getElementById("weather-widget-container");
    if (!weatherContainer) return;

    // Show spinner inside widget
    weatherContainer.innerHTML = `
      <div class="flex items-center justify-center h-48">
        <div class="loader mr-2"></div>
        <span class="text-slate-500 font-medium">Loading weather data...</span>
      </div>
    `;

    const weather = await this.getWeather(lat, lng);
    this.weatherDataCache = weather;

    let iconHtml = "";
    if (weather.isMock) {
      iconHtml = `<i class="fas ${weather.iconClass} text-5xl text-yellow-300 drop-shadow"></i>`;
    } else {
      iconHtml = `<img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" alt="weather" class="w-16 h-16 -my-2">`;
    }

    let alertsHtml = "";
    if (weather.alerts && weather.alerts.length > 0) {
      alertsHtml = weather.alerts.map(alert => {
        let bgColor = "bg-blue-50 border-blue-200 text-blue-800";
        let icon = "fa-info-circle";
        if (alert.type === "warning") {
          bgColor = "bg-amber-50 border-amber-200 text-amber-800";
          icon = "fa-exclamation-triangle";
        } else if (alert.type === "danger") {
          bgColor = "bg-red-50 border-red-200 text-red-800";
          icon = "fa-times-circle";
        }
        return `
          <div class="flex items-start p-3 border rounded-lg ${bgColor} text-xs font-medium space-x-2">
            <i class="fas ${icon} mt-0.5 text-sm"></i>
            <div>
              <p class="font-bold">${alert.title}</p>
              <p class="opacity-90">${alert.message}</p>
            </div>
          </div>
        `;
      }).join("");
    } else {
      alertsHtml = `
        <div class="flex items-center p-3 border border-emerald-100 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium space-x-2">
          <i class="fas fa-check-circle text-emerald-500 text-sm"></i>
          <span>No weather-related crop risks detected today. Weather is optimal.</span>
        </div>
      `;
    }

    const isNight = new Date().getHours() > 18 || new Date().getHours() < 6;
    const cardBgClass = isNight ? "weather-card-night text-slate-100" : "weather-card text-white";

    weatherContainer.innerHTML = `
      <div class="rounded-2xl p-5 shadow-lg ${cardBgClass}">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-bold text-lg">${weather.location}</h4>
            <p class="text-xs opacity-75">${weather.isMock ? "Simulated weather data" : "Real-time weather API"}</p>
          </div>
          ${iconHtml}
        </div>
        <div class="mt-4 flex items-baseline">
          <span class="text-5xl font-extrabold tracking-tight">${weather.temp}°C</span>
          <span class="ml-2 text-sm capitalize opacity-90 font-medium">${weather.description}</span>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4 border-t border-white/20 pt-4 text-xs opacity-90">
          <div class="flex items-center">
            <i class="fas fa-tint w-5 text-sky-200"></i>
            <span>Humidity: <strong>${weather.humidity}%</strong></span>
          </div>
          <div class="flex items-center">
            <i class="fas fa-wind w-5 text-sky-200"></i>
            <span>Wind: <strong>${weather.windSpeed} km/h</strong></span>
          </div>
        </div>
      </div>

      <!-- 3-day forecast -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <h5 class="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">3-Day Forecast</h5>
        <div class="grid grid-cols-3 gap-2">
          ${weather.forecast.map(day => {
            let dayIcon = "";
            if (weather.isMock) {
              dayIcon = `<i class="fas ${day.icon} text-slate-500 text-lg"></i>`;
            } else {
              dayIcon = `<img src="https://openweathermap.org/img/wn/${day.icon}.png" class="w-8 h-8 mx-auto" alt="desc">`;
            }
            return `
              <div class="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span class="text-xs text-slate-500 font-semibold block mb-1">${day.day}</span>
                <div class="h-8 flex items-center justify-center">
                  ${dayIcon}
                </div>
                <span class="text-sm font-bold text-slate-800 block mt-1">${day.temp}°C</span>
                <span class="text-[10px] text-slate-400 block truncate">${day.desc}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Alerts -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col space-y-2">
        <h5 class="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">Smart Crop Warnings</h5>
        ${alertsHtml}
      </div>
    `;
  }
}

// Export singleton
window.weatherManager = new WeatherManager();
