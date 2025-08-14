// BC.Game Crash Monitor - Web App JavaScript
console.log("BC.Game Crash Monitor Web App loaded");

class CrashDashboard {
  constructor() {
    // Supabase configuration - REPLACE WITH YOUR CREDENTIALS
    this.supabaseUrl = "https://tpowdztczaiysxwxnxgr.supabase.co";
    this.supabaseKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwb3dkenRjemFpeXN4d3hueGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMzc4ODUsImV4cCI6MjA3MDcxMzg4NX0.87A0N6SH3iFtPlTKHkK5ogW1MvYYbEoOHPqWkD1Yax8";
    this.tableName = "crash_values";

    this.supabase = null;
    this.data = [];
    this.filteredData = [];
    this.isPaused = false;
    this.lastUpdateTime = null;

    this.init();
  }

  init() {
    // Initialize Supabase client
    try {
      this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
      console.log("Supabase client initialized");
    } catch (error) {
      console.error("Failed to initialize Supabase:", error);
      this.updateConnectionStatus("Error: Check credentials");
      return;
    }

    // Get DOM elements
    this.elements = {
      totalRecords: document.getElementById("totalRecords"),
      lastUpdate: document.getElementById("lastUpdate"),
      connectionStatus: document.getElementById("connectionStatus"),
      minValue: document.getElementById("minValue"),
      maxValue: document.getElementById("maxValue"),
      timeRange: document.getElementById("timeRange"),
      applyFilters: document.getElementById("applyFilters"),
      clearFilters: document.getElementById("clearFilters"),
      pauseBtn: document.getElementById("pauseBtn"),
      exportBtn: document.getElementById("exportBtn"),
      crashTableBody: document.getElementById("crashTableBody"),
    };

    // Set up event listeners
    this.setupEventListeners();

    // Load initial data
    this.loadData();

    // Set up real-time updates
    this.setupRealTimeUpdates();
  }

  setupEventListeners() {
    this.elements.applyFilters.addEventListener("click", () =>
      this.applyFilters()
    );
    this.elements.clearFilters.addEventListener("click", () =>
      this.clearFilters()
    );
    this.elements.pauseBtn.addEventListener("click", () => this.togglePause());
    this.elements.exportBtn.addEventListener("click", () => this.exportData());
  }

  async loadData() {
    try {
      this.updateConnectionStatus("Loading...");

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        throw error;
      }

      this.data = data || [];
      this.filteredData = [...this.data];
      this.updateUI();
      this.updateConnectionStatus("Connected");

      console.log(`Loaded ${this.data.length} records`);
    } catch (error) {
      console.error("Error loading data:", error);
      this.updateConnectionStatus("Error: " + error.message);
    }
  }

  setupRealTimeUpdates() {
    if (!this.supabase) return;

    // Subscribe to real-time changes
    const channel = this.supabase
      .channel("crash_values_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: this.tableName,
        },
        (payload) => {
          if (!this.isPaused) {
            console.log("New record received:", payload.new);
            this.data.unshift(payload.new);

            // Keep only last 1000 records
            if (this.data.length > 1000) {
              this.data = this.data.slice(0, 1000);
            }

            this.applyCurrentFilters();
            this.updateUI();
            this.lastUpdateTime = new Date();
            this.updateLastUpdateTime();
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to real-time updates");
        } else if (status === "CHANNEL_ERROR") {
          console.error("Real-time subscription error");
          this.updateConnectionStatus("Real-time Error");
        }
      });

    console.log("Real-time subscription set up");

    // Also set up periodic polling as fallback
    this.setupPolling();
  }

  setupPolling() {
    // Poll for new data every 5 seconds as fallback
    setInterval(async () => {
      if (!this.isPaused) {
        try {
          const { data, error } = await this.supabase
            .from(this.tableName)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);

          if (error) throw error;

          if (data && data.length > 0) {
            // Check if we have new records
            const latestRecord = data[0];
            const currentLatest = this.data[0];

            if (!currentLatest || latestRecord.id !== currentLatest.id) {
              // We have new data, reload
              this.loadData();
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }
    }, 5000);
  }

  applyFilters() {
    const minValue = parseFloat(this.elements.minValue.value) || 0;
    const maxValue = parseFloat(this.elements.maxValue.value) || Infinity;
    const timeRange = this.elements.timeRange.value;

    let filtered = [...this.data];

    // Apply value filters
    filtered = filtered.filter((record) => {
      const numericValue = record.numeric_value;
      return numericValue >= minValue && numericValue <= maxValue;
    });

    // Apply time filter
    if (timeRange !== "all") {
      const now = new Date();
      let cutoffTime;

      switch (timeRange) {
        case "1h":
          cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "24h":
          cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      if (cutoffTime) {
        filtered = filtered.filter((record) => {
          const recordTime = new Date(record.created_at);
          return recordTime > cutoffTime;
        });
      }
    }

    this.filteredData = filtered;
    this.updateUI();
  }

  applyCurrentFilters() {
    // Reapply current filters when new data arrives
    if (
      this.elements.minValue.value ||
      this.elements.maxValue.value ||
      this.elements.timeRange.value !== "all"
    ) {
      this.applyFilters();
    } else {
      this.filteredData = [...this.data];
    }
  }

  clearFilters() {
    this.elements.minValue.value = "";
    this.elements.maxValue.value = "";
    this.elements.timeRange.value = "all";
    this.filteredData = [...this.data];
    this.updateUI();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.elements.pauseBtn.textContent = this.isPaused ? "Resume" : "Pause";
    this.elements.pauseBtn.className = this.isPaused
      ? "btn btn-primary"
      : "btn btn-secondary";
  }

  updateUI() {
    this.updateStats();
    this.updateTable();
  }

  updateStats() {
    this.elements.totalRecords.textContent = this.filteredData.length;
  }

  updateTable() {
    const tbody = this.elements.crashTableBody;

    if (this.filteredData.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="loading">No data available</td></tr>';
      return;
    }

    // Show latest 50 records
    const recentData = this.filteredData.slice(0, 50);

    tbody.innerHTML = recentData
      .map((record) => {
        const time = new Date(record.timestamp).toLocaleString();
        const numericValue = record.numeric_value;

        let statusClass = "status-low";
        let statusText = "Low";

        if (numericValue >= 5.0) {
          statusClass = "status-high";
          statusText = "Very High";
        } else if (numericValue >= 2.0) {
          statusClass = "status-medium";
          statusText = "High";
        }

        return `
        <tr>
          <td>${time}</td>
          <td class="crash-value ${statusClass.replace("status-", "")}">${
          record.crash_value
        }</td>
          <td>${numericValue.toFixed(2)}</td>
          <td class="${statusClass}">${statusText}</td>
        </tr>
      `;
      })
      .join("");
  }

  updateConnectionStatus(status) {
    this.elements.connectionStatus.textContent = status;
  }

  updateLastUpdateTime() {
    if (this.lastUpdateTime) {
      this.elements.lastUpdate.textContent =
        this.lastUpdateTime.toLocaleTimeString();
    }
  }

  exportData() {
    if (this.filteredData.length === 0) {
      alert("No data to export");
      return;
    }

    const csvHeader = "Timestamp,Crash Value,Numeric Value,URL,Created At\n";
    const csvRows = this.filteredData
      .map(
        (record) =>
          `"${record.timestamp}","${record.crash_value}","${record.numeric_value}","${record.url}","${record.created_at}"`
      )
      .join("\n");

    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `crash_data_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Initialize the dashboard when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new CrashDashboard();
});
