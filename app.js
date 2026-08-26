// Central State & Application Controller
class App {
  constructor() {
    this.currentView = "overview";
    this.currentRole = "Farmer";
    this.settings = {};
    
    // Modal states
    this.activeFieldId = null;
    this.activeCropId = null;
  }

  init() {
    this.loadSettings();
    this.setupViewRouter();
    this.setupEventListeners();
    this.renderOverviewStats();
    this.renderUpcomingActivities();
    
    // Render initial views
    this.renderFieldsList();
    this.renderCropsList();
    this.renderActivitiesList();
    this.renderPriceAlerts();
    
    // Initialize maps and charts on start
    window.farmMapManager.initOverviewMap();
    window.chartManager.renderAllCharts();
    this.updateWeatherForFirstField();
    
    // Apply Role rules
    this.applyRoleAccess();

    // Start telemetry simulation interval loop (every 10 seconds)
    if (window.sensorManager) {
      window.sensorManager.evaluateThresholdAlerts();
      this.renderPriceAlerts(); // update banner with initial telemetry checks
      setInterval(() => {
        window.sensorManager.runTelemetrySimulation();
        this.onTelemetryTick();
      }, 10000);
    }
  }

  // Load configuration from localStorage
  loadSettings() {
    this.settings = JSON.parse(localStorage.getItem("farm_settings")) || {
      role: "Farmer",
      weather_api_key: "",
      unit_preference: "Metric",
      weather_lat: 18.5204,
      weather_lng: 73.8567
    };
    this.currentRole = this.settings.role;
    
    // Set settings inputs
    const roleSelector = document.getElementById("settings-role");
    const keyInput = document.getElementById("settings-api-key");
    const govKeyInput = document.getElementById("settings-gov-key");
    const unitSelector = document.getElementById("settings-unit");
    
    if (roleSelector) roleSelector.value = this.currentRole;
    if (keyInput) keyInput.value = this.settings.weather_api_key || "";
    if (govKeyInput) govKeyInput.value = this.settings.gov_api_key || "";
    if (unitSelector) unitSelector.value = this.settings.unit_preference || "Metric";
  }

  // Router for SPA navigation
  setupViewRouter() {
    const navItems = document.querySelectorAll("[data-target-view]");
    navItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const targetView = item.getAttribute("data-target-view");
        this.switchView(targetView);
        
        // Update active class in sidebar
        navItems.forEach(nav => {
          nav.classList.remove("bg-emerald-600", "text-white");
          nav.classList.add("text-slate-300", "hover:bg-slate-700");
        });
        item.classList.remove("text-slate-300", "hover:bg-slate-700");
        item.classList.add("bg-emerald-600", "text-white");
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    
    // Toggle active state for content containers
    const sections = document.querySelectorAll(".view-section");
    sections.forEach(sec => {
      sec.classList.remove("active");
      if (sec.id === `${viewName}-view`) {
        sec.classList.add("active");
      }
    });

    // Specific load triggers depending on view
    if (viewName === "overview") {
      setTimeout(() => {
        window.farmMapManager.initOverviewMap();
        this.updateWeatherForFirstField();
      }, 50);
    } else if (viewName === "reports") {
      setTimeout(() => {
        window.chartManager.renderAllCharts();
      }, 50);
    } else if (viewName === "market") {
      setTimeout(() => {
        this.initMarketPage();
      }, 50);
    } else if (viewName === "sensors") {
      setTimeout(() => {
        this.initSensorsPage();
      }, 50);
    }
  }

  // Role Access restrictions
  applyRoleAccess() {
    // Switch elements display depending on roles: Admin, Farmer, Worker
    const adminFarmerElements = document.querySelectorAll(".role-admin-farmer");
    const workerElements = document.querySelectorAll(".role-worker");
    const financeElements = document.querySelectorAll(".role-finance");

    if (this.currentRole === "Worker") {
      // Workers cannot write configurations, add crops, add fields or view money
      adminFarmerElements.forEach(el => el.classList.add("hidden"));
      financeElements.forEach(el => el.classList.add("hidden"));
      workerElements.forEach(el => el.classList.remove("hidden"));
      
      // Disable edit forms inputs
      document.querySelectorAll(".worker-disable").forEach(el => {
        el.disabled = true;
      });
    } else {
      // Admin/Farmer full access
      adminFarmerElements.forEach(el => el.classList.remove("hidden"));
      financeElements.forEach(el => el.classList.remove("hidden"));
      workerElements.forEach(el => el.classList.add("hidden"));
      
      document.querySelectorAll(".worker-disable").forEach(el => {
        el.disabled = false;
      });
    }

    // Update Role badges in UI
    const roleBadges = document.querySelectorAll(".current-role-badge");
    roleBadges.forEach(b => {
      b.textContent = this.currentRole;
      if (this.currentRole === "Worker") {
        b.className = "current-role-badge px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800";
      } else if (this.currentRole === "Farmer") {
        b.className = "current-role-badge px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800";
      } else {
        b.className = "current-role-badge px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800";
      }
    });
  }

  // Update weather for first field in database
  updateWeatherForFirstField() {
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    if (fields.length > 0) {
      window.weatherManager.updateWeatherUI(fields[0].lat, fields[0].lng);
    } else {
      window.weatherManager.updateWeatherUI(this.settings.weather_lat, this.settings.weather_lng);
    }
  }

  // Setup Event Listeners for Forms and Buttons
  setupEventListeners() {
    // Add Field Form Submit
    const fieldForm = document.getElementById("add-field-form");
    if (fieldForm) {
      fieldForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAddField();
      });
    }

    // Add Crop Form Submit
    const cropForm = document.getElementById("add-crop-form");
    if (cropForm) {
      cropForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAddCrop();
      });
    }

    // Add Activity Form Submit
    const activityForm = document.getElementById("add-activity-form");
    if (activityForm) {
      activityForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAddActivity();
      });
    }

    // Add Yield Form Submit
    const yieldForm = document.getElementById("add-yield-form");
    if (yieldForm) {
      yieldForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAddYield();
      });
    }

    // Settings Form Submit
    const settingsForm = document.getElementById("settings-form");
    if (settingsForm) {
      settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSaveSettings();
      });
    }
  }

  // ---- DATA RENDERING & INJECTIONS ----

  renderOverviewStats() {
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    const crops = JSON.parse(localStorage.getItem("farm_crops")) || [];
    const activities = JSON.parse(localStorage.getItem("farm_activities")) || [];
    const yields = JSON.parse(localStorage.getItem("farm_yields")) || [];

    // Calculate total area
    const totalArea = fields.reduce((sum, f) => sum + parseFloat(f.area), 0).toFixed(1);
    
    // Active crops count
    const activeCropsCount = crops.filter(c => c.status !== "Harvested").length;

    // Scheduled activities (due today or future)
    const todayStr = new Date().toISOString().split("T")[0];
    const tasksDue = activities.filter(a => a.date >= todayStr).length;

    // Average Yield
    let avgYield = 0;
    if (yields.length > 0) {
      const totalYield = yields.reduce((sum, y) => sum + parseFloat(y.quantity), 0);
      avgYield = (totalYield / yields.length).toFixed(1);
    }

    // Update HTML elements
    document.getElementById("stat-total-fields").textContent = fields.length;
    document.getElementById("stat-total-area").textContent = `${totalArea} Acres`;
    document.getElementById("stat-active-crops").textContent = activeCropsCount;
    document.getElementById("stat-tasks-due").textContent = tasksDue;
    document.getElementById("stat-avg-yield").textContent = `${avgYield} Tons`;
  }

  renderUpcomingActivities() {
    const container = document.getElementById("upcoming-activities-list");
    if (!container) return;

    const activities = JSON.parse(localStorage.getItem("farm_activities")) || [];
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];

    // Filter upcoming (chronologically latest)
    const sorted = [...activities].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    if (sorted.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">No tasks recorded yet.</p>`;
      return;
    }

    container.innerHTML = sorted.map(act => {
      const field = fields.find(f => f.id === act.field_id);
      const fieldName = field ? field.name : "Unknown Field";
      let icon = "fa-tint text-blue-500";
      let bg = "bg-blue-50";

      if (act.type === "Fertilizer") {
        icon = "fa-leaf text-emerald-500";
        bg = "bg-emerald-50";
      } else if (act.type === "Pesticide") {
        icon = "fa-bug text-red-500";
        bg = "bg-red-50";
      } else if (act.type === "Weeding") {
        icon = "fa-seedling text-amber-500";
        bg = "bg-amber-50";
      } else if (act.type === "Soil Test") {
        icon = "fa-flask text-purple-500";
        bg = "bg-purple-50";
      } else if (act.type === "Harvesting") {
        icon = "fa-tractor text-orange-500";
        bg = "bg-orange-50";
      }

      return `
        <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center ${bg}">
              <i class="fas ${icon} text-lg"></i>
            </div>
            <div>
              <h5 class="text-sm font-bold text-slate-800">${act.type} - ${fieldName}</h5>
              <p class="text-xs text-slate-400">${act.details || "No details provided"}</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-500 block font-medium">${act.date}</span>
            <span class="text-xs font-bold text-slate-800 role-finance">$${act.cost || 0}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // --- FIELDS CRUD & LISTING ---

  renderFieldsList() {
    const container = document.getElementById("fields-grid");
    if (!container) return;

    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    const crops = JSON.parse(localStorage.getItem("farm_crops")) || [];

    if (fields.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <i class="fas fa-map-marked-alt text-4xl text-slate-300 mb-3"></i>
          <p class="text-slate-500">No fields registered yet.</p>
          <button onclick="app.showAddFieldModal()" class="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm role-admin-farmer">Add Your First Field</button>
        </div>
      `;
      return;
    }

    container.innerHTML = fields.map(field => {
      const activeCrop = crops.find(c => c.field_id === field.id && c.status !== "Harvested");
      const cropBadge = activeCrop 
        ? `<span class="px-2 py-0.5 rounded text-xs font-semibold text-emerald-700 bg-emerald-100">${activeCrop.crop_name} (${activeCrop.status})</span>`
        : `<span class="px-2 py-0.5 rounded text-xs font-semibold text-slate-500 bg-slate-100">Fallow</span>`;

      return `
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-extrabold text-slate-800 text-lg">${field.name}</h4>
                <p class="text-xs text-slate-400 flex items-center mt-1">
                  <i class="fas fa-map-marker-alt text-slate-300 mr-1"></i> Lat: ${parseFloat(field.lat).toFixed(4)}, Lng: ${parseFloat(field.lng).toFixed(4)}
                </p>
              </div>
              <button onclick="app.deleteField('${field.id}')" class="text-red-400 hover:text-red-600 transition p-1.5 role-admin-farmer" title="Delete Field">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
            
            <div class="mt-4 grid grid-cols-2 gap-3 text-xs border-t border-b border-slate-100 py-3 my-4">
              <div>
                <span class="text-slate-400 block mb-0.5">Area Size</span>
                <span class="font-bold text-slate-700 text-sm">${field.area} Acres</span>
              </div>
              <div>
                <span class="text-slate-400 block mb-0.5">Soil Type</span>
                <span class="font-bold text-slate-700 text-sm">${field.soil_type}</span>
              </div>
            </div>
            
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs text-slate-400">Current Status</span>
              ${cropBadge}
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-2 pt-2">
            <button onclick="app.showFieldDetail('${field.id}')" class="px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition">
              History & Logs
            </button>
            <button onclick="app.showAddCropModal('${field.id}')" class="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm transition role-admin-farmer">
              Assign Crop
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  showFieldDetail(fieldId) {
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    const crops = JSON.parse(localStorage.getItem("farm_crops")) || [];
    const activities = JSON.parse(localStorage.getItem("farm_activities")) || [];
    
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    this.activeFieldId = fieldId;

    // Load static field data
    document.getElementById("detail-field-name").textContent = field.name;
    document.getElementById("detail-area").textContent = `${field.area} Acres`;
    document.getElementById("detail-soil").textContent = field.soil_type;
    document.getElementById("detail-coords").textContent = `${field.lat.toFixed(5)}, ${field.lng.toFixed(5)}`;

    // Build Crop History list
    const fieldCrops = crops.filter(c => c.field_id === fieldId);
    
    // Fetch live IoT readings
    this.renderDetailModalSensors(fieldId);

    // Fetch live crop price match
    const activeCrop = fieldCrops.find(c => c.status !== "Harvested");
    const priceContainer = document.getElementById("detail-mandi-match");
    if (priceContainer) {
      if (activeCrop) {
        const match = window.marketPriceManager.getLiveCropPrice(activeCrop.crop_name);
        priceContainer.innerHTML = `
          <div>
            <span class="block text-slate-800 text-[10px]">Growing commodity: <strong>${match.crop}</strong></span>
            <span class="block text-slate-600 text-[10px]">Reference: ${match.mandi}</span>
            <span class="block font-bold text-xs mt-0.5 text-emerald-800">Rate: ₹${match.price} / Quintal</span>
          </div>
        `;
      } else {
        priceContainer.innerHTML = `
          <span class="text-slate-400 italic text-[10px]">Field is fallow. Assign a crop to track market rates.</span>
        `;
      }
    }

    const historyContainer = document.getElementById("detail-crop-history");
    if (fieldCrops.length === 0) {
      historyContainer.innerHTML = `<li class="text-xs text-slate-400 italic">No crops cultivated on this field yet.</li>`;
    } else {
      historyContainer.innerHTML = fieldCrops.map(crop => {
        let statusColor = "text-blue-600 bg-blue-50";
        if (crop.status === "Ready for Harvest") statusColor = "text-yellow-600 bg-yellow-50";
        else if (crop.status === "Harvested") statusColor = "text-slate-600 bg-slate-50";
        
        return `
          <li class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div>
              <span class="font-bold text-xs text-slate-800">${crop.crop_name}</span>
              <span class="text-[10px] text-slate-400 block">${crop.variety} | Sown: ${crop.sowing_date}</span>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded font-semibold ${statusColor}">${crop.status}</span>
          </li>
        `;
      }).join("");
    }

    // Build Activities list for this field
    const fieldActivities = activities.filter(a => a.field_id === fieldId);
    const actContainer = document.getElementById("detail-activities-log");
    if (fieldActivities.length === 0) {
      actContainer.innerHTML = `<li class="text-xs text-slate-400 italic">No activities logged yet.</li>`;
    } else {
      actContainer.innerHTML = fieldActivities.map(act => `
        <li class="p-2 border border-slate-100 rounded-lg bg-white">
          <div class="flex justify-between items-start">
            <span class="font-bold text-xs text-slate-700">${act.type}</span>
            <span class="text-[10px] text-slate-400">${act.date}</span>
          </div>
          <p class="text-[10px] text-slate-500 mt-0.5">${act.details}</p>
          <div class="mt-1 text-right role-finance">
            <span class="text-[10px] font-bold text-slate-800">Cost: $${act.cost}</span>
          </div>
        </li>
      `).join("");
    }

    // Show Modal
    this.openModal("field-detail-modal");
  }

  handleAddField() {
    const name = document.getElementById("field-name").value;
    const area = parseFloat(document.getElementById("field-area").value);
    const soilType = document.getElementById("field-soil-type").value;
    const lat = parseFloat(document.getElementById("field-lat").value);
    const lng = parseFloat(document.getElementById("field-lng").value);

    if (!name || isNaN(area) || isNaN(lat) || isNaN(lng)) {
      alert("Please fill all details and click on the map to specify GPS coordinates.");
      return;
    }

    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    
    // Generate square coordinates around center latitude/longitude
    const coordinates = window.farmMapManager.generateFieldPolygon(lat, lng, area);

    const newField = {
      id: "f" + (Date.now()),
      name,
      area,
      soil_type: soilType,
      lat,
      lng,
      coordinates
    };

    fields.push(newField);
    localStorage.setItem("farm_fields", JSON.stringify(fields));

    // Reset Form & Close
    document.getElementById("add-field-form").reset();
    this.closeModal("add-field-modal");

    // Redraw and Re-render
    this.renderFieldsList();
    this.renderOverviewStats();
    window.farmMapManager.drawOverviewFields();
    this.updateWeatherForFirstField();
  }

  deleteField(fieldId) {
    if (!confirm("Are you sure you want to delete this field? All crop records and logged activities will remain but no longer link to this field.")) return;

    let fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    fields = fields.filter(f => f.id !== fieldId);
    localStorage.setItem("farm_fields", JSON.stringify(fields));

    this.renderFieldsList();
    this.renderOverviewStats();
    window.farmMapManager.drawOverviewFields();
    this.updateWeatherForFirstField();
  }

  // --- CROPS CRUD & LISTING ---

  renderCropsList() {
    const container = document.getElementById("crops-list");
    if (!container) return;

    const crops = JSON.parse(localStorage.getItem("farm_crops")) || [];
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];

    if (crops.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-slate-400 text-sm">No crops assigned to fields yet.</td>
        </tr>
      `;
      return;
    }

    container.innerHTML = crops.map(crop => {
      const field = fields.find(f => f.id === crop.field_id);
      const fieldName = field ? field.name : "Unknown Field";

      let statusColor = "stage-badge-sown";
      if (crop.status === "Vegetative") statusColor = "stage-badge-vegetative";
      else if (crop.status === "Flowering") statusColor = "stage-badge-flowering";
      else if (crop.status === "Ready for Harvest") statusColor = "stage-badge-ready";
      else if (crop.status === "Harvested") statusColor = "stage-badge-harvested";

      // Crop Row Layout
      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-slate-700">
          <td class="px-6 py-4 font-bold text-slate-800">
            <span class="block">${crop.crop_name}</span>
            <span class="text-xs text-slate-400 font-normal">${crop.variety}</span>
          </td>
          <td class="px-6 py-4 font-semibold text-slate-600">${fieldName}</td>
          <td class="px-6 py-4 text-xs font-medium">${crop.sowing_date}</td>
          <td class="px-6 py-4 text-xs font-medium">${crop.harvest_date}</td>
          <td class="px-6 py-4">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}">${crop.status}</span>
          </td>
          <td class="px-6 py-4 text-right">
            <div class="flex justify-end space-x-1.5">
              ${crop.status !== "Harvested" ? `
                <button onclick="app.showUpdateStageModal('${crop.id}', '${crop.status}')" class="px-2.5 py-1 text-xs bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 rounded font-bold transition" title="Update Stage">
                  Stage
                </button>
                <button onclick="app.showHarvestModal('${crop.id}')" class="px-2.5 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold shadow-sm transition role-admin-farmer" title="Record Harvest">
                  Harvest
                </button>
              ` : `
                <span class="text-xs text-emerald-600 font-bold italic"><i class="fas fa-check"></i> Recorded</span>
              `}
              <button onclick="app.deleteCrop('${crop.id}')" class="text-red-400 hover:text-red-600 transition p-1 role-admin-farmer">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  showAddCropModal(fieldId = null) {
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    const select = document.getElementById("crop-field-select");
    
    if (!select) return;

    if (fields.length === 0) {
      alert("Please add at least one field before registering a crop assignment.");
      return;
    }

    // Populate Fields Selector
    select.innerHTML = fields.map(f => `<option value="${f.id}" ${fieldId === f.id ? 'selected' : ''}>${f.name} (${f.area} Acres)</option>`).join("");

    this.openModal("add-crop-modal");
  }

  handleAddCrop() {
    const fieldId = document.getElementById("crop-field-select").value;
    const cropName = document.getElementById("crop-name").value;
    const variety = document.getElementById("crop-variety").value;
    const sowingDate = document.getElementById("crop-sowing").value;
    const harvestDate = document.getElementById("crop-harvest").value;
    const notes = document.getElementById("crop-notes").value;

    if (!cropName || !sowingDate || !harvestDate) {
      alert("Please fill all required inputs.");
      return;
    }

    const crops = JSON.parse(localStorage.getItem("farm_crops")) || [];

    const newCrop = {
      id: "c" + (Date.now()),
      field_id: fieldId,
      crop_name: cropName,
      variety: variety || "Standard Variety",
      sowing_date: sowingDate,
      harvest_date: harvestDate,
      status: "Sown",
      notes: notes
    };

    crops.push(newCrop);
    localStorage.setItem("farm_crops", JSON.stringify(crops));

    // Reset Form & Close
    document.getElementById("add-crop-form").reset();
    this.closeModal("add-crop-modal");

    // Redraw and Re-render
    this.renderCropsList();
    this.renderOverviewStats();
    this.renderFieldsList();
    window.farmMapManager.drawOverviewFields();
  }

  showUpdateStageModal(cropId, currentStage) {
    this.activeCropId = cropId;
    const selector = document.getElementById("update-stage-select");
    if (selector) selector.value = currentStage;
    this.openModal("update-stage-modal");
  }

  handleUpdateStage() {
    const newStage = document.getElementById("update-stage-select").value;
    const crops = JSON.parse(localStorage.getItem("farm_crops")) || [];
    const crop = crops.find(c => c.id === this.activeCropId);
    
    if (crop) {
      crop.status = newStage;
      localStorage.setItem("farm_crops", JSON.stringify(crops));
      
      this.renderCropsList();
      this.renderFieldsList();
      window.farmMapManager.drawOverviewFields();
      this.closeModal("update-stage-modal");
    }
  }

  showHarvestModal(cropId) {
    this.activeCropId = cropId;
    
    const crops = JSON.parse(localStorage.getItem("farm_crops")) || [];
    const crop = crops.find(c => c.id === cropId);
    if (!crop) return;

    document.getElementById("harvest-crop-title").textContent = `Harvest Record - ${crop.crop_name}`;
    
    this.openModal("harvest-modal");
  }

  handleRecordHarvest() {
    const quantity = parseFloat(document.getElementById("harvest-quantity").value);
    const cost = parseFloat(document.getElementById("harvest-cost").value);
    const revenue = parseFloat(document.getElementById("harvest-revenue").value);
    const date = document.getElementById("harvest-date").value;
    const season = document.getElementById("harvest-season").value;

    if (isNaN(quantity) || isNaN(cost) || isNaN(revenue) || !date || !season) {
      alert("Please fill all numeric cost / yield variables.");
      return;
    }

    const crops = JSON.parse(localStorage.getItem("farm_crops")) || [];
    const yields = JSON.parse(localStorage.getItem("farm_yields")) || [];
    const activities = JSON.parse(localStorage.getItem("farm_activities")) || [];

    const crop = crops.find(c => c.id === this.activeCropId);
    if (!crop) return;

    // Update Crop status to Harvested
    crop.status = "Harvested";
    crop.harvest_date = date;

    // Add Yield Log
    const newYield = {
      id: "y" + (Date.now()),
      crop_id: this.activeCropId,
      crop_name: crop.crop_name,
      field_id: crop.field_id,
      quantity,
      unit: "Tons",
      date,
      season,
      revenue,
      cost
    };

    // Auto-log a corresponding harvesting activity
    const newActivity = {
      id: "a" + (Date.now()),
      field_id: crop.field_id,
      type: "Harvesting",
      date,
      details: `Successful harvesting of crop: ${crop.crop_name} (${crop.variety}). Yielded ${quantity} Tons.`,
      cost: cost
    };

    yields.push(newYield);
    activities.push(newActivity);

    localStorage.setItem("farm_crops", JSON.stringify(crops));
    localStorage.setItem("farm_yields", JSON.stringify(yields));
    localStorage.setItem("farm_activities", JSON.stringify(activities));

    // Reset and Close
    document.getElementById("harvest-form").reset();
    this.closeModal("harvest-modal");

    // Redraw Dashboard
    this.renderCropsList();
    this.renderActivitiesList();
    this.renderFieldsList();
    this.renderOverviewStats();
    this.renderUpcomingActivities();
    window.farmMapManager.drawOverviewFields();
    window.chartManager.renderAllCharts();
  }

  deleteCrop(cropId) {
    if (!confirm("Are you sure you want to delete this crop assignment?")) return;

    let crops = JSON.parse(localStorage.getItem("farm_crops")) || [];
    crops = crops.filter(c => c.id !== cropId);
    localStorage.setItem("farm_crops", JSON.stringify(crops));

    this.renderCropsList();
    this.renderFieldsList();
    this.renderOverviewStats();
    window.farmMapManager.drawOverviewFields();
  }

  // --- ACTIVITIES CRUD & LISTING ---

  renderActivitiesList() {
    const tableBody = document.getElementById("activities-table-body");
    if (!tableBody) return;

    const activities = JSON.parse(localStorage.getItem("farm_activities")) || [];
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];

    if (activities.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-8 text-slate-400 text-sm">No activity logs recorded.</td>
        </tr>
      `;
      return;
    }

    // Sort chronologically descending
    const sorted = [...activities].sort((a, b) => new Date(b.date) - new Date(a.date));

    tableBody.innerHTML = sorted.map(act => {
      const field = fields.find(f => f.id === act.field_id);
      const fieldName = field ? field.name : "Unknown Field";

      let typeColor = "bg-blue-100 text-blue-800";
      if (act.type === "Fertilizer") typeColor = "bg-emerald-100 text-emerald-800";
      else if (act.type === "Pesticide") typeColor = "bg-red-100 text-red-800";
      else if (act.type === "Weeding") typeColor = "bg-amber-100 text-amber-800";
      else if (act.type === "Harvesting") typeColor = "bg-orange-100 text-orange-800";

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-slate-700 text-xs">
          <td class="px-6 py-4 font-bold text-slate-600">${act.date}</td>
          <td class="px-6 py-4 font-semibold text-slate-800">${fieldName}</td>
          <td class="px-6 py-4">
            <span class="px-2 py-0.5 rounded font-semibold ${typeColor}">${act.type}</span>
          </td>
          <td class="px-6 py-4 text-slate-600 font-medium max-w-xs truncate" title="${act.details}">${act.details}</td>
          <td class="px-6 py-4 font-bold text-slate-800 role-finance">$${act.cost}</td>
          <td class="px-6 py-4 text-right">
            <button onclick="app.deleteActivity('${act.id}')" class="text-red-400 hover:text-red-600 transition p-1 role-admin-farmer">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  showAddActivityModal() {
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    const select = document.getElementById("act-field-select");
    if (!select) return;

    if (fields.length === 0) {
      alert("Please add a field before logging agricultural activities.");
      return;
    }

    // Populate Fields Selector
    select.innerHTML = fields.map(f => `<option value="${f.id}">${f.name}</option>`).join("");

    this.openModal("add-activity-modal");
  }

  handleAddActivity() {
    const fieldId = document.getElementById("act-field-select").value;
    const type = document.getElementById("act-type").value;
    const date = document.getElementById("act-date").value;
    const cost = parseFloat(document.getElementById("act-cost").value) || 0;
    const details = document.getElementById("act-details").value;

    if (!date || !type) {
      alert("Please fill all required activity inputs.");
      return;
    }

    const activities = JSON.parse(localStorage.getItem("farm_activities")) || [];

    const newActivity = {
      id: "a" + (Date.now()),
      field_id: fieldId,
      type,
      date,
      details: details || "Regular application.",
      cost: this.currentRole === "Worker" ? 0 : cost // Workers don't register costs
    };

    activities.push(newActivity);
    localStorage.setItem("farm_activities", JSON.stringify(activities));

    // Reset and Close
    document.getElementById("add-activity-form").reset();
    this.closeModal("add-activity-modal");

    // Redraw UI
    this.renderActivitiesList();
    this.renderOverviewStats();
    this.renderUpcomingActivities();
    window.chartManager.renderAllCharts(); // costs changed, update reports
  }

  deleteActivity(actId) {
    if (!confirm("Are you sure you want to delete this activity log?")) return;

    let activities = JSON.parse(localStorage.getItem("farm_activities")) || [];
    activities = activities.filter(a => a.id !== actId);
    localStorage.setItem("farm_activities", JSON.stringify(activities));

    this.renderActivitiesList();
    this.renderOverviewStats();
    this.renderUpcomingActivities();
    window.chartManager.renderAllCharts();
  }

  // --- SETTINGS FORM ---

  handleSaveSettings() {
    const role = document.getElementById("settings-role").value;
    const key = document.getElementById("settings-api-key").value;
    const govKey = document.getElementById("settings-gov-key").value;
    const unit = document.getElementById("settings-unit").value;

    const settings = {
      role,
      weather_api_key: key,
      gov_api_key: govKey,
      unit_preference: unit,
      weather_lat: 18.5204,
      weather_lng: 73.8567
    };

    localStorage.setItem("farm_settings", JSON.stringify(settings));
    this.settings = settings;
    this.currentRole = role;

    this.applyRoleAccess();
    this.updateWeatherForFirstField();
    
    // Refresh tables showing/hiding cost column
    this.renderActivitiesList();
    this.renderCropsList();
    this.renderUpcomingActivities();

    alert("Settings saved successfully!");
  }

  resetAllData() {
    if (!confirm("WARNING: This will wipe all custom fields, crops, activities and yields, restoring default mock database values. Continue?")) return;

    window.resetDatabaseToMock();
    this.loadSettings();
    this.init(); // Restart everything
    alert("Database restored to defaults!");
  }

  // ---- MODAL CONTROLS ----

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      
      // Initialize map inside add-field modal specifically
      if (modalId === "add-field-modal") {
        setTimeout(() => {
          window.farmMapManager.initPickerMap();
        }, 100);
      }
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }

  // ---- MARKET PRICE CHECKER VIEW METHODS ----

  initMarketPage() {
    const stateSelect = document.getElementById("mandi-state");
    const distSelect = document.getElementById("mandi-district");
    const yardSelect = document.getElementById("mandi-yard");

    if (!stateSelect) return;

    // Load states
    const mandisData = window.marketPriceManager.mockMandis;
    const states = Object.keys(mandisData);
    
    stateSelect.innerHTML = states.map(s => `<option value="${s}">${s}</option>`).join("");

    // Populate districts based on state
    const populateDistricts = () => {
      const state = stateSelect.value;
      const districts = Object.keys(mandisData[state] || {});
      distSelect.innerHTML = districts.map(d => `<option value="${d}">${d}</option>`).join("");
      populateYards();
    };

    // Populate yards based on district
    const populateYards = () => {
      const state = stateSelect.value;
      const district = distSelect.value;
      const yards = Object.keys(mandisData[state]?.[district] || {});
      yardSelect.innerHTML = yards.map(y => `<option value="${y}">${y}</option>`).join("");
    };

    // Setup events
    stateSelect.onchange = populateDistricts;
    distSelect.onchange = populateYards;

    // Initial load
    populateDistricts();

    // Trigger initial lookup
    this.updateMarketLookup();
    this.renderPriceAlerts();
  }

  async updateMarketLookup() {
    const state = document.getElementById("mandi-state").value;
    const district = document.getElementById("mandi-district").value;
    const mandi = document.getElementById("mandi-yard").value;
    const crop = document.getElementById("mandi-crop").value;

    const minText = document.getElementById("mandi-min-price");
    const modalText = document.getElementById("mandi-modal-price");
    const maxText = document.getElementById("mandi-max-price");
    const sourceBadge = document.getElementById("mandi-source-badge");

    if (!minText || !modalText || !maxText) return;

    // Show loading
    modalText.textContent = "Loading...";

    const priceInfo = await window.marketPriceManager.getMarketPrice(state, district, mandi, crop);
    
    minText.textContent = `₹${priceInfo.min}`;
    modalText.textContent = `₹${priceInfo.modal}`;
    maxText.textContent = `₹${priceInfo.max}`;
    sourceBadge.textContent = priceInfo.isMock ? "Simulated Agmarknet" : "Agmarknet Live API";
    sourceBadge.className = priceInfo.isMock 
      ? "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800"
      : "px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800";

    // Update Price Trend Chart
    const trend = window.marketPriceManager.getHistoricalTrend(priceInfo.modal);
    window.chartManager.renderMarketTrendChart(trend.labels, trend.data, crop);
  }

  renderPriceAlerts() {
    const tableBody = document.getElementById("price-alerts-table-body");
    const banner = document.getElementById("price-alerts-banner");

    // Recalculate triggers
    const alerts = window.marketPriceManager.checkAlerts();
    const sensorAlerts = window.sensorManager.getSensorAlerts();

    // 1. Render Table List
    if (tableBody) {
      if (alerts.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-4 text-slate-400">No price alerts scheduled yet.</td>
          </tr>
        `;
      } else {
        tableBody.innerHTML = alerts.map(alert => {
          const statusBadge = alert.isTriggered
            ? `<span class="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">Triggered</span>`
            : `<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-500">Monitoring</span>`;
          
          const conditionLabel = alert.condition === "above" ? "Price \u2265" : "Price \u2264";

          return `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-slate-700">
              <td class="py-2.5 font-bold text-slate-800">${alert.crop}</td>
              <td class="py-2.5 font-semibold">${conditionLabel} ₹${alert.targetPrice}</td>
              <td class="py-2.5 text-slate-500">${alert.mandi} (${alert.state})</td>
              <td class="py-2.5">${statusBadge}</td>
              <td class="py-2.5 text-right">
                <button onclick="app.deleteAlert('${alert.id}')" class="text-red-400 hover:text-red-600 transition p-1">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          `;
        }).join("");
      }
    }

    // 2. Render Top Overview Alerts Banner (includes both Mandi and IoT alerts!)
    if (banner) {
      const triggeredPrice = alerts.filter(a => a.isTriggered);
      const allActiveAlerts = [
        ...triggeredPrice.map(a => ({
          type: "Mandi Price",
          message: `${a.crop} in <strong>${a.mandi}</strong> has crossed target limit of ₹${a.targetPrice}!`,
          action: "switchView('market')",
          actionLabel: "Check Mandi",
          isCritical: false
        })),
        ...sensorAlerts.map(a => ({
          type: "IoT Sensor",
          message: a.message,
          action: "switchView('sensors')",
          actionLabel: "Inspect IoT",
          isCritical: a.type === "Critical"
        }))
      ];

      if (allActiveAlerts.length === 0) {
        banner.innerHTML = "";
        banner.classList.add("hidden");
      } else {
        banner.classList.remove("hidden");
        banner.innerHTML = allActiveAlerts.map(alert => {
          const bg = alert.isCritical ? "bg-red-50 border-red-200 text-red-900" : "bg-amber-50 border-amber-200 text-amber-900";
          const icon = alert.type === "IoT Sensor" ? "fa-microchip" : "fa-coins";
          const iconColor = alert.isCritical ? "text-red-500" : "text-amber-600";
          const btnClass = alert.isCritical ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700";

          return `
            <div class="flex items-center justify-between p-3.5 border rounded-xl text-xs font-semibold shadow-sm space-x-3 w-full ${bg}">
              <div class="flex items-center space-x-2">
                <i class="fas ${icon} ${iconColor} text-sm"></i>
                <div>
                  <span class="font-bold">${alert.type} Alert:</span>
                  <span>${alert.message}</span>
                </div>
              </div>
              <button onclick="app.${alert.action}" class="px-2.5 py-1 text-white rounded transition font-bold text-[10px] uppercase tracking-wide flex-shrink-0 ${btnClass}">
                ${alert.actionLabel}
              </button>
            </div>
          `;
        }).join("");
      }
    }
  }

  handleCreateAlert() {
    const crop = document.getElementById("alert-crop-select").value;
    const targetPrice = document.getElementById("alert-target-price").value;
    const condition = document.getElementById("alert-condition").value;

    const state = document.getElementById("mandi-state").value;
    const district = document.getElementById("mandi-district").value;
    const mandi = document.getElementById("mandi-yard").value;

    if (!targetPrice) {
      alert("Please enter a target price.");
      return;
    }

    window.marketPriceManager.addAlert(crop, targetPrice, condition, state, district, mandi);
    
    // Reset Form
    document.getElementById("price-alert-form").reset();
    
    // Refresh alerts table & banners
    this.renderPriceAlerts();
  }

  deleteAlert(alertId) {
    window.marketPriceManager.deleteAlert(alertId);
    this.renderPriceAlerts();
  }

  // ---- IoT SENSOR VIEWS & TELEMETRY CONTROLLER ----

  onTelemetryTick() {
    // 1. Re-render overview alerts banner
    this.renderPriceAlerts();

    // 2. If user is currently looking at the sensors view, update cards dynamically
    if (this.currentView === "sensors") {
      this.renderSensorFields();
    }

    // 3. If field detail drawer modal is open, update its stats
    const modal = document.getElementById("field-detail-modal");
    if (modal && !modal.classList.contains("hidden") && this.activeFieldId) {
      this.renderDetailModalSensors(this.activeFieldId);
    }
  }

  initSensorsPage() {
    const fieldSelect = document.getElementById("sensor-chart-field");
    if (!fieldSelect) return;

    // Load active fields select options
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    fieldSelect.innerHTML = fields.map(f => `<option value="${f.id}">${f.name}</option>`).join("");

    // Render cards
    this.renderSensorFields();

    // Draw initial charts
    this.updateSensorChart();
  }

  renderSensorFields() {
    const grid = document.getElementById("sensor-fields-grid");
    if (!grid) return;

    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    const crops = JSON.parse(localStorage.getItem("farm_crops")) || [];

    if (fields.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center py-6 text-slate-400">No fields mapped yet. Go to Fields view to register lands.</div>`;
      return;
    }

    grid.innerHTML = fields.map(field => {
      // Find growing crop details
      const activeCrop = crops.find(c => c.field_id === field.id && c.status !== "Harvested");
      const cropName = activeCrop ? activeCrop.crop_name : "Fallow";
      
      const latest = window.sensorManager.getLatestReadings(field.id);
      const status = window.sensorManager.getFieldSensorStatus(field.id);
      
      let dotColor = "sensor-dot-optimal";
      let statusLabel = "Optimal Status";
      if (status === "Critical") {
        dotColor = "sensor-dot-critical";
        statusLabel = "Action Needed";
      } else if (status === "Warning") {
        dotColor = "sensor-dot-warning";
        statusLabel = "Out of Range";
      }

      // Trend indicators
      const mTrend = window.sensorManager.getTrendIndicator(field.id, "moisture");
      const stTrend = window.sensorManager.getTrendIndicator(field.id, "soilTemp");
      const atTrend = window.sensorManager.getTrendIndicator(field.id, "ambientTemp");
      const hTrend = window.sensorManager.getTrendIndicator(field.id, "humidity");
      const pTrend = window.sensorManager.getTrendIndicator(field.id, "ph");

      return `
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <!-- Field Telemetry Header -->
            <div class="flex justify-between items-start border-b border-slate-100 pb-2 mb-3">
              <div>
                <h3 class="font-extrabold text-slate-800 text-sm">${field.name}</h3>
                <span class="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Crop: ${cropName}</span>
              </div>
              <div class="flex items-center space-x-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                <span class="w-2 h-2 rounded-full ${dotColor}"></span>
                <span class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">${statusLabel}</span>
              </div>
            </div>

            <!-- Reading Metrics Grid -->
            <div class="grid grid-cols-2 gap-3">
              <!-- Moisture -->
              <div class="p-2.5 bg-sky-50/50 border border-sky-100/50 rounded-xl">
                <span class="text-[9px] text-sky-600 font-bold uppercase tracking-wider block">Soil Moisture</span>
                <div class="flex justify-between items-baseline mt-1">
                  <span class="text-base font-black text-sky-800 font-mono-val">${latest.moisture}%</span>
                  <span class="text-xs font-black text-sky-500">${mTrend}</span>
                </div>
              </div>
              
              <!-- Soil Temp -->
              <div class="p-2.5 bg-amber-50/50 border border-amber-100/50 rounded-xl">
                <span class="text-[9px] text-amber-600 font-bold uppercase tracking-wider block">Soil Temp</span>
                <div class="flex justify-between items-baseline mt-1">
                  <span class="text-base font-black text-amber-800 font-mono-val">${latest.soilTemp}°C</span>
                  <span class="text-xs font-black text-amber-500">${stTrend}</span>
                </div>
              </div>

              <!-- Ambient Temp -->
              <div class="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Ambient Temp</span>
                <div class="flex justify-between items-baseline mt-1">
                  <span class="text-base font-black text-slate-700 font-mono-val">${latest.ambientTemp}°C</span>
                  <span class="text-xs font-black text-slate-400">${atTrend}</span>
                </div>
              </div>

              <!-- Ambient Humidity -->
              <div class="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Ambient Humid</span>
                <div class="flex justify-between items-baseline mt-1">
                  <span class="text-base font-black text-slate-700 font-mono-val">${latest.humidity}%</span>
                  <span class="text-xs font-black text-slate-400">${hTrend}</span>
                </div>
              </div>
            </div>

            <!-- Soil pH -->
            <div class="mt-3 p-2 bg-purple-50/30 border border-purple-100/50 rounded-xl flex justify-between items-center px-3">
              <span class="text-[9px] text-purple-600 font-bold uppercase tracking-wider">Soil pH Level</span>
              <div class="flex items-center space-x-2">
                <span class="text-xs font-black text-purple-800 font-mono-val">pH ${latest.ph}</span>
                <span class="text-xs font-black text-purple-400">${pTrend}</span>
              </div>
            </div>
          </div>

          <button onclick="app.showFieldDetail('${field.id}')" class="w-full py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-[10px] uppercase tracking-wider transition mt-3">
            Inspect Operations & Telemetry
          </button>
        </div>
      `;
    }).join("");
  }

  updateSensorChart() {
    const fieldId = document.getElementById("sensor-chart-field").value;
    const metric = document.getElementById("sensor-chart-metric").value;

    if (!fieldId || !metric) return;

    const all = window.sensorManager.getAllReadings();
    const history = all[fieldId] || [];

    if (history.length === 0) return;

    // Grab labels and values (showing timestamps formatted)
    const labels = history.map(h => {
      const date = new Date(h.timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const dataset = history.map(h => h[metric]);

    // Metric display mapping
    const metricNames = {
      moisture: "Soil Moisture",
      soilTemp: "Soil Temperature",
      ambientTemp: "Ambient Temperature",
      humidity: "Ambient Humidity",
      ph: "Soil pH"
    };

    const metricUnits = {
      moisture: "%",
      soilTemp: "°C",
      ambientTemp: "°C",
      humidity: "%",
      ph: ""
    };

    window.chartManager.renderSensorHistoryChart(
      labels,
      dataset,
      metricNames[metric],
      metricUnits[metric]
    );
  }

  renderDetailModalSensors(fieldId) {
    const container = document.getElementById("detail-iot-readings");
    if (!container) return;

    const latest = window.sensorManager.getLatestReadings(fieldId);
    
    const mTrend = window.sensorManager.getTrendIndicator(fieldId, "moisture");
    const stTrend = window.sensorManager.getTrendIndicator(fieldId, "soilTemp");
    const pTrend = window.sensorManager.getTrendIndicator(fieldId, "ph");

    container.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="text-slate-400 font-semibold text-[10px] uppercase">Soil Moisture</span>
        <div class="space-x-1.5 flex items-center">
          <span class="font-bold font-mono-val text-sky-700">${latest.moisture}%</span>
          <span class="text-sky-500 font-bold text-xs">${mTrend}</span>
        </div>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-slate-400 font-semibold text-[10px] uppercase">Soil Temp</span>
        <div class="space-x-1.5 flex items-center">
          <span class="font-bold font-mono-val text-amber-700">${latest.soilTemp}°C</span>
          <span class="text-amber-500 font-bold text-xs">${stTrend}</span>
        </div>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-slate-400 font-semibold text-[10px] uppercase">Soil pH</span>
        <div class="space-x-1.5 flex items-center">
          <span class="font-bold font-mono-val text-purple-700">pH ${latest.ph}</span>
          <span class="text-purple-400 font-bold text-xs">${pTrend}</span>
        </div>
      </div>
    `;
  }
}

// Instantiate and start
function startApp() {
  if (!window.app) {
    window.app = new App();
    window.app.init();
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
