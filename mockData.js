// Initial seed data for Crop & Field Management Dashboard
const DEFAULT_MOCK_DATA = {
  settings: {
    role: "Farmer",
    weather_api_key: "",
    unit_preference: "Metric", // Metric (C, Hectares, kg) or Imperial (F, Acres, lbs)
    weather_lat: 18.5204, // Default Pune, India area (fertile region)
    weather_lng: 73.8567
  },
  fields: [
    {
      id: "f1",
      name: "North Meadow",
      area: 12.5,
      soil_type: "Loam",
      lat: 18.5254,
      lng: 73.8587,
      coordinates: [
        [18.5270, 73.8570],
        [18.5270, 73.8604],
        [18.5238, 73.8604],
        [18.5238, 73.8570]
      ],
      history: [
        { date: "2025-05-10", crop: "Corn", yield: "45 Tons", notes: "Good harvest, slight nitrogen depletion." },
        { date: "2024-11-12", crop: "Wheat", yield: "38 Tons", notes: "Normal soil moisture, minor pest attack handled." }
      ]
    },
    {
      id: "f2",
      name: "East Riverfront",
      area: 8.2,
      soil_type: "Clay Loam",
      lat: 18.5190,
      lng: 73.8710,
      coordinates: [
        [18.5210, 73.8690],
        [18.5210, 73.8730],
        [18.5170, 73.8730],
        [18.5170, 73.8690]
      ],
      history: [
        { date: "2025-04-15", crop: "Rice", yield: "32 Tons", notes: "High water consumption due to clay content." }
      ]
    },
    {
      id: "f3",
      name: "Hillside Slopes",
      area: 5.4,
      soil_type: "Sandy Loam",
      lat: 18.5080,
      lng: 73.8480,
      coordinates: [
        [18.5100, 73.8460],
        [18.5100, 73.8500],
        [18.5060, 73.8500],
        [18.5060, 73.8460]
      ],
      history: [
        { date: "2025-03-20", crop: "Soybean", yield: "15 Tons", notes: "Slight soil erosion detected on north slope." }
      ]
    }
  ],
  crops: [
    {
      id: "c1",
      field_id: "f1",
      crop_name: "Wheat",
      variety: "HD-2967 High Yield",
      sowing_date: "2026-06-15",
      harvest_date: "2026-10-15",
      status: "Flowering",
      notes: "Sown early, healthy green leaves. Crop needs nitrogen check."
    },
    {
      id: "c2",
      field_id: "f2",
      crop_name: "Rice",
      variety: "Basmati-370",
      sowing_date: "2026-07-01",
      harvest_date: "2026-11-15",
      status: "Vegetative",
      notes: "Irrigation running daily. Good growth stage."
    },
    {
      id: "c3",
      field_id: "f3",
      crop_name: "Soybeans",
      variety: "JS 335",
      sowing_date: "2026-05-10",
      harvest_date: "2026-09-10",
      status: "Ready for Harvest",
      notes: "Pods filled nicely. Harvest scheduled next week."
    }
  ],
  activities: [],
  yields: [
    {
      id: "y1",
      crop_id: "c1", // Link to historical crops or older crop names
      crop_name: "Corn", // for display flexibility
      field_id: "f1",
      quantity: 45.0,
      unit: "Tons",
      date: "2025-05-10",
      season: "Kharif 2025",
      revenue: 9000,
      cost: 3500
    },
    {
      id: "y2",
      crop_id: "c2",
      crop_name: "Rice",
      field_id: "f2",
      quantity: 32.0,
      unit: "Tons",
      date: "2025-04-15",
      season: "Rabi 2024-25",
      revenue: 8000,
      cost: 2800
    },
    {
      id: "y3",
      crop_id: "c3",
      crop_name: "Wheat",
      field_id: "f1",
      quantity: 38.0,
      unit: "Tons",
      date: "2024-11-12",
      season: "Rabi 2023-24",
      revenue: 7600,
      cost: 2400
    },
    {
      id: "y4",
      crop_id: "c4",
      crop_name: "Soybean",
      field_id: "f3",
      quantity: 15.0,
      unit: "Tons",
      date: "2025-03-20",
      season: "Kharif 2024",
      revenue: 4500,
      cost: 1500
    }
  ]
};

// Seed function to initialize database in localStorage
function initializeDatabase() {
  if (!localStorage.getItem("farm_settings")) {
    localStorage.setItem("farm_settings", JSON.stringify(DEFAULT_MOCK_DATA.settings));
  }
  if (!localStorage.getItem("farm_fields")) {
    localStorage.setItem("farm_fields", JSON.stringify(DEFAULT_MOCK_DATA.fields));
  }
  if (!localStorage.getItem("farm_crops")) {
    localStorage.setItem("farm_crops", JSON.stringify(DEFAULT_MOCK_DATA.crops));
  }
  if (!localStorage.getItem("farm_activities")) {
    localStorage.setItem("farm_activities", JSON.stringify(DEFAULT_MOCK_DATA.activities));
  }
  if (!localStorage.getItem("farm_yields")) {
    localStorage.setItem("farm_yields", JSON.stringify(DEFAULT_MOCK_DATA.yields));
  }
  if (!localStorage.getItem("farm_price_alerts")) {
    const defaultAlerts = [
      {
        id: "alert-1",
        crop: "Wheat",
        targetPrice: 2150,
        condition: "above",
        state: "Maharashtra",
        district: "Pune",
        mandi: "Pune Mandi",
        isTriggered: true,
        dateCreated: "2026-08-25"
      }
    ];
    localStorage.setItem("farm_price_alerts", JSON.stringify(defaultAlerts));
  }
}

// Reset database function
function resetDatabaseToMock() {
  localStorage.setItem("farm_settings", JSON.stringify(DEFAULT_MOCK_DATA.settings));
  localStorage.setItem("farm_fields", JSON.stringify(DEFAULT_MOCK_DATA.fields));
  localStorage.setItem("farm_crops", JSON.stringify(DEFAULT_MOCK_DATA.crops));
  localStorage.setItem("farm_activities", JSON.stringify(DEFAULT_MOCK_DATA.activities));
  localStorage.setItem("farm_yields", JSON.stringify(DEFAULT_MOCK_DATA.yields));
  localStorage.setItem("farm_price_alerts", JSON.stringify([
    {
      id: "alert-1",
      crop: "Wheat",
      targetPrice: 2150,
      condition: "above",
      state: "Maharashtra",
      district: "Pune",
      mandi: "Pune Mandi",
      isTriggered: true,
      dateCreated: "2026-08-25"
    }
  ]));
  localStorage.removeItem("farm_sensor_readings");
  localStorage.removeItem("farm_sensor_alerts");
  if (window.sensorManager) {
    window.sensorManager.initDatabase();
  }
}

// Initial execute
initializeDatabase();
window.DEFAULT_MOCK_DATA = DEFAULT_MOCK_DATA;
window.initializeDatabase = initializeDatabase;
window.resetDatabaseToMock = resetDatabaseToMock;
