// Dashboard Visual Analytics using Chart.js
class ChartManager {
  constructor() {
    this.yieldTrendChart = null;
    this.financialChart = null;
    this.productivityChart = null;
    this.marketTrendChart = null;
    this.sensorHistoryChart = null;
  }

  // Destroys all current charts to prevent overlapping redraw bugs
  destroyAll() {
    if (this.yieldTrendChart) this.yieldTrendChart.destroy();
    if (this.financialChart) this.financialChart.destroy();
    if (this.productivityChart) this.productivityChart.destroy();
    if (this.marketTrendChart) this.marketTrendChart.destroy();
    if (this.sensorHistoryChart) this.sensorHistoryChart.destroy();
    this.yieldTrendChart = null;
    this.financialChart = null;
    this.productivityChart = null;
    this.marketTrendChart = null;
    this.sensorHistoryChart = null;
  }

  // Renders analytics dashboard charts
  renderAllCharts() {
    // Destroy previous charts before drawing new ones
    this.destroyAll();

    if (typeof Chart === 'undefined') {
      const ids = ["yieldTrendChart", "financialChart", "productivityChart"];
      ids.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
          const wrapper = canvas.parentNode;
          if (wrapper) {
            wrapper.innerHTML = `
              <div class="flex flex-col items-center justify-center h-full bg-slate-50 text-slate-400 text-xs text-center p-4 border border-dashed border-slate-200 rounded-xl">
                <i class="fas fa-chart-line text-lg mb-1 text-slate-300"></i>
                <p class="font-bold">Chart Library Offline</p>
                <p class="text-[10px] mt-0.5">Connect to the internet to initialize Chart.js modules.</p>
              </div>
            `;
          }
        }
      });
      return;
    }

    const yields = JSON.parse(localStorage.getItem("farm_yields")) || [];
    const fields = JSON.parse(localStorage.getItem("farm_fields")) || [];

    if (yields.length === 0) return;

    // Sort yields chronologically for plotting
    const sortedYields = [...yields].sort((a, b) => new Date(a.date) - new Date(b.date));

    this.renderYieldTrends(sortedYields);
    this.renderFinancialAnalysis(sortedYields);
    this.renderFieldProductivity(sortedYields, fields);
  }

  // 1. Line Chart: Yield Trends over time per Crop
  renderYieldTrends(yieldsData) {
    const ctx = document.getElementById("yieldTrendChart");
    if (!ctx) return;

    // Extract unique crops and seasons/dates
    const seasons = [...new Set(yieldsData.map(y => y.season || new Date(y.date).toLocaleDateString()))];
    const cropNames = [...new Set(yieldsData.map(y => y.crop_name))];

    // Build dataset per crop
    const colors = [
      "rgba(16, 185, 129, 1)",  // Emerald
      "rgba(59, 130, 246, 1)",  // Blue
      "rgba(234, 179, 8, 1)",   // Yellow
      "rgba(168, 85, 247, 1)",  // Purple
      "rgba(249, 115, 22, 1)"   // Orange
    ];

    const datasets = cropNames.map((crop, idx) => {
      const dataPoints = seasons.map(season => {
        // Sum yield for this crop in this season
        const yieldRecord = yieldsData.find(y => y.crop_name === crop && (y.season === season || new Date(y.date).toLocaleDateString() === season));
        return yieldRecord ? yieldRecord.quantity : 0;
      });

      return {
        label: crop,
        data: dataPoints,
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length].replace(", 1)", ", 0.1)"),
        tension: 0.3,
        borderWidth: 2,
        fill: true
      };
    });

    this.yieldTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: seasons,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          tooltip: {
            mode: "index",
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Quantity (Tons)",
              font: { weight: "bold" }
            }
          }
        }
      }
    });
  }

  // 2. Bar Chart: Financial comparison - Cost vs Output (Revenue)
  renderFinancialAnalysis(yieldsData) {
    const ctx = document.getElementById("financialChart");
    if (!ctx) return;

    // Group costs and revenues by season
    const financeBySeason = {};
    yieldsData.forEach(y => {
      const key = y.season || new Date(y.date).toLocaleDateString();
      if (!financeBySeason[key]) {
        financeBySeason[key] = { cost: 0, revenue: 0 };
      }
      financeBySeason[key].cost += y.cost || 0;
      financeBySeason[key].revenue += y.revenue || 0;
    });

    const seasons = Object.keys(financeBySeason);
    const costs = seasons.map(s => financeBySeason[s].cost);
    const revenues = seasons.map(s => financeBySeason[s].revenue);
    const netProfits = seasons.map(s => financeBySeason[s].revenue - financeBySeason[s].cost);

    this.financialChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: seasons,
        datasets: [
          {
            label: "Production Cost ($)",
            data: costs,
            backgroundColor: "rgba(239, 68, 68, 0.8)", // Light Red
            borderColor: "rgba(239, 68, 68, 1)",
            borderWidth: 1
          },
          {
            label: "Gross Revenue ($)",
            data: revenues,
            backgroundColor: "rgba(16, 185, 129, 0.8)", // Light Emerald
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 1
          },
          {
            label: "Net Profit ($)",
            data: netProfits,
            type: "line",
            borderColor: "rgba(37, 99, 235, 1)", // Blue
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            tension: 0.2,
            borderWidth: 2,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Value in USD ($)",
              font: { weight: "bold" }
            }
          }
        }
      }
    });
  }

  // 3. Bar Chart: Field Productivity (Tons per Acre)
  renderFieldProductivity(yieldsData, fieldsData) {
    const ctx = document.getElementById("productivityChart");
    if (!ctx) return;

    // Calculate total yield divided by field area for each field
    const fieldProductivity = [];

    fieldsData.forEach(field => {
      // Find all yields recorded for this field
      const fieldYields = yieldsData.filter(y => y.field_id === field.id);
      
      if (fieldYields.length === 0) return;

      const totalYield = fieldYields.reduce((sum, y) => sum + y.quantity, 0);
      const productivity = totalYield / field.area; // Tons per Acre

      fieldProductivity.push({
        name: field.name,
        productivity: parseFloat(productivity.toFixed(2)),
        area: field.area,
        totalYield: totalYield
      });
    });

    this.productivityChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: fieldProductivity.map(fp => fp.name),
        datasets: [
          {
            label: "Productivity Index (Tons/Acre)",
            data: fieldProductivity.map(fp => fp.productivity),
            backgroundColor: "rgba(139, 92, 246, 0.8)", // Purple
            borderColor: "rgba(139, 92, 246, 1)",
            borderWidth: 1,
            yAxisID: "y"
          },
          {
            label: "Total Harvest (Tons)",
            data: fieldProductivity.map(fp => fp.totalYield),
            backgroundColor: "rgba(249, 115, 22, 0.4)", // Light Orange
            borderColor: "rgba(249, 115, 22, 0.8)",
            borderWidth: 1,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" }
        },
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: {
              display: true,
              text: "Productivity (Tons/Acre)",
              font: { weight: "bold" }
            },
            beginAtZero: true
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: {
              display: true,
              text: "Total Volume (Tons)",
              font: { weight: "bold" }
            },
            beginAtZero: true,
            grid: {
              drawOnChartArea: false // prevent grid lines overlay
            }
          }
        }
      }
    });
  }

  // 4. Line Chart: Market Price Trend for selected crop
  renderMarketTrendChart(labels, data, cropName) {
    const ctx = document.getElementById("marketTrendChart");
    if (!ctx) return;

    if (this.marketTrendChart) {
      this.marketTrendChart.destroy();
    }

    if (typeof Chart === 'undefined') {
      return;
    }

    this.marketTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: `${cropName} Mandi Rate (₹/Quintal)`,
          data: data,
          borderColor: "rgba(16, 185, 129, 1)",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.2,
          borderWidth: 2.5,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: "Price (₹ per Quintal)",
              font: { weight: "bold", size: 11 }
            }
          }
        }
      }
    });
  }

  // 5. Line Chart: IoT sensor reading history
  renderSensorHistoryChart(labels, dataset, sensorMetricName, unit) {
    const ctx = document.getElementById("sensorsHistoryChart");
    if (!ctx) return;

    if (this.sensorHistoryChart) {
      this.sensorHistoryChart.destroy();
    }

    if (typeof Chart === 'undefined') {
      return;
    }

    // Set colors depending on metric
    let color = "rgba(59, 130, 246, 1)"; // Blue
    if (sensorMetricName.toLowerCase().includes("moisture")) color = "rgba(14, 165, 233, 1)"; // Sky blue
    else if (sensorMetricName.toLowerCase().includes("temp")) color = "rgba(249, 115, 22, 1)"; // Orange
    else if (sensorMetricName.toLowerCase().includes("ph")) color = "rgba(139, 92, 246, 1)";    // Purple

    this.sensorHistoryChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: `${sensorMetricName} (${unit})`,
          data: dataset,
          borderColor: color,
          backgroundColor: color.replace(", 1)", ", 0.08)"),
          tension: 0.25,
          borderWidth: 2,
          fill: true,
          pointRadius: 1,
          pointHoverRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: `${sensorMetricName} (${unit})`,
              font: { weight: "bold", size: 10 }
            }
          }
        }
      }
    });
  }
}

// Export singleton
window.chartManager = new ChartManager();
