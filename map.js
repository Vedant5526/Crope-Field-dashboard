// Leaflet.js Mapping Layer for Fields
class FarmMapManager {
  constructor() {
    this.overviewMap = null;
    this.pickerMap = null;
    this.pickerMarker = null;
    this.overviewLayers = [];
    this.defaultCenter = [18.5204, 73.8567]; // Pune default
    this.defaultZoom = 13;
  }

  // Load overview map showing all fields
  initOverviewMap() {
    const mapElement = document.getElementById("overview-map");
    if (!mapElement) return;

    if (typeof L === 'undefined') {
      mapElement.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full bg-slate-100 text-slate-500 text-xs text-center p-6 border border-slate-200 rounded-xl">
          <i class="fas fa-wifi-slash text-2xl text-slate-400 mb-2"></i>
          <p class="font-bold">Leaflet Map Failed to Load</p>
          <p class="mt-1">Connect to the internet to initialize the interactive OpenStreetMap layers.</p>
        </div>
      `;
      return;
    }

    // If map already initialized, just redraw layers
    if (this.overviewMap) {
      this.drawOverviewFields();
      return;
    }

    this.overviewMap = L.map("overview-map").setView(this.defaultCenter, this.defaultZoom);

    // Add standard OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.overviewMap);

    this.drawOverviewFields();
  }

  // Clear existing polygons and re-draw fields from localStorage
  drawOverviewFields() {
    if (!this.overviewMap) return;

    // Clear old layers
    this.overviewLayers.forEach(layer => this.overviewMap.removeLayer(layer));
    this.overviewLayers = [];

    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];
    const crops = JSON.parse(localStorage.getItem("farm_crops")) || [];

    if (fields.length === 0) return;

    const bounds = [];

    fields.forEach(field => {
      // Find active crop for the field
      const activeCrop = crops.find(c => c.field_id === field.id && c.status !== "Harvested");

      // Define color based on active crop status or soil type
      let color = "#10b981"; // Default emerald green
      let fillOpacity = 0.4;

      if (activeCrop) {
        if (activeCrop.status === "Ready for Harvest") {
          color = "#eab308"; // Yellow-ish
          fillOpacity = 0.55;
        } else if (activeCrop.status === "Vegetative") {
          color = "#3b82f6"; // Blue
        } else if (activeCrop.status === "Flowering") {
          color = "#a855f7"; // Purple
        }
      } else {
        color = "#94a3b8"; // Gray if fallow (no active crop)
        fillOpacity = 0.25;
      }

      // Draw Polygon
      if (field.coordinates && field.coordinates.length > 0) {
        const polygon = L.polygon(field.coordinates, {
          color: color,
          fillColor: color,
          fillOpacity: fillOpacity,
          weight: 2
        }).addTo(this.overviewMap);

        // Bind interactive popup
        const popupContent = `
          <div class="p-1">
            <h4 class="font-bold text-slate-800 text-sm border-b pb-1 mb-1">${field.name}</h4>
            <p class="text-xs text-slate-600"><strong>Area:</strong> ${field.area} Acres</p>
            <p class="text-xs text-slate-600"><strong>Soil:</strong> ${field.soil_type}</p>
            <p class="text-xs text-slate-600"><strong>Crop:</strong> ${activeCrop ? `<span class="font-semibold text-emerald-600">${activeCrop.crop_name} (${activeCrop.status})</span>` : '<span class="text-slate-400 italic">Fallow (No active crop)</span>'}</p>
            <div class="mt-2 pt-1 border-t flex justify-between space-x-2">
              <button onclick="app.showFieldDetail('${field.id}')" class="px-2 py-1 text-[10px] font-bold text-white bg-emerald-500 rounded hover:bg-emerald-600 transition">View Details</button>
              <button onclick="app.showAddCropModal('${field.id}')" class="px-2 py-1 text-[10px] font-bold text-white bg-blue-500 rounded hover:bg-blue-600 transition">Assign Crop</button>
            </div>
          </div>
        `;
        polygon.bindPopup(popupContent);
        this.overviewLayers.push(polygon);

        // Collect coordinates to fit map view
        field.coordinates.forEach(coord => bounds.push(coord));
      } else if (field.lat && field.lng) {
        // Fallback to circular marker if polygon not set
        const marker = L.circle([field.lat, field.lng], {
          radius: Math.sqrt(field.area * 4046.856) / 2, // approximation of field radius in Acres
          color: color,
          fillColor: color,
          fillOpacity: fillOpacity,
          weight: 2
        }).addTo(this.overviewMap);

        const popupContent = `
          <div class="p-1">
            <h4 class="font-bold text-slate-800 text-sm border-b pb-1 mb-1">${field.name}</h4>
            <p class="text-xs text-slate-600"><strong>Area:</strong> ${field.area} Acres</p>
            <p class="text-xs text-slate-600"><strong>Soil:</strong> ${field.soil_type}</p>
            <p class="text-xs text-slate-600"><strong>Crop:</strong> ${activeCrop ? `<span class="font-semibold text-emerald-600">${activeCrop.crop_name}</span>` : '<span class="text-slate-400 italic">Fallow</span>'}</p>
            <div class="mt-2 pt-1 border-t flex justify-between">
              <button onclick="app.showFieldDetail('${field.id}')" class="px-2 py-1 text-[10px] font-bold text-white bg-emerald-500 rounded hover:bg-emerald-600 transition">View Details</button>
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);
        this.overviewLayers.push(marker);
        bounds.push([field.lat, field.lng]);
      }
    });

    // Fit map bounds to show all fields
    if (bounds.length > 0) {
      this.overviewMap.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  // Initialize Map Picker inside Field Add Form modal
  initPickerMap() {
    const mapElement = document.getElementById("field-picker-map");
    if (!mapElement) return;

    // Reset picker map container to redraw on open modal
    if (this.pickerMap) {
      this.pickerMap.remove();
      this.pickerMap = null;
      this.pickerMarker = null;
    }

    if (typeof L === 'undefined') {
      mapElement.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full bg-slate-100 text-slate-500 text-xs text-center p-4 border border-slate-200 rounded-xl">
          <p class="font-bold">Map Picker Offline</p>
          <p class="text-[10px] mt-0.5">Cannot load map layers. Enter coordinates manually below.</p>
        </div>
      `;
      const latInput = document.getElementById("field-lat");
      const lngInput = document.getElementById("field-lng");
      if (latInput && lngInput) {
        latInput.readOnly = false;
        lngInput.readOnly = false;
        latInput.classList.remove("bg-slate-50");
        lngInput.classList.remove("bg-slate-50");
        latInput.placeholder = "e.g. 18.5204";
        lngInput.placeholder = "e.g. 73.8567";
      }
      return;
    }

    this.pickerMap = L.map("field-picker-map").setView(this.defaultCenter, this.defaultZoom - 1);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.pickerMap);

    // Click event to capture lat/lng
    this.pickerMap.on("click", (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      document.getElementById("field-lat").value = lat.toFixed(6);
      document.getElementById("field-lng").value = lng.toFixed(6);

      if (this.pickerMarker) {
        this.pickerMarker.setLatLng(e.latlng);
      } else {
        this.pickerMarker = L.marker(e.latlng, { draggable: true }).addTo(this.pickerMap);
        this.pickerMarker.on("dragend", (event) => {
          const markerLatLng = event.target.getLatLng();
          document.getElementById("field-lat").value = markerLatLng.lat.toFixed(6);
          document.getElementById("field-lng").value = markerLatLng.lng.toFixed(6);
        });
      }
    });

    // Let map handle container sizes properly after layout updates
    setTimeout(() => {
      this.pickerMap.invalidateSize();
    }, 200);
  }

  // Helper to generate a square polygon centered around latitude/longitude of specified area size (in acres)
  generateFieldPolygon(lat, lng, areaAcres) {
    // 1 Acre = 4,046.856 square meters. A square of 1 acre is 63.61m x 63.61m.
    // Earth radius = 6378137m. Delta lat/lng approx calculation:
    const halfSideMeters = Math.sqrt(areaAcres * 4046.856) / 2;
    const deltaLat = (halfSideMeters / 6378137) * (180 / Math.PI);
    const deltaLng = (halfSideMeters / (6378137 * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);

    return [
      [lat + deltaLat, lng - deltaLng],
      [lat + deltaLat, lng + deltaLng],
      [lat - deltaLat, lng + deltaLng],
      [lat - deltaLat, lng - deltaLng]
    ];
  }
}

// Export singleton
window.farmMapManager = new FarmMapManager();
