// BC.Game Crash Monitor - Web App JavaScript (Realtime Database Version)
console.log("BC.Game Crash Monitor Web App loaded (RTDB)");

class CrashDashboard {
  constructor() {
    // Firebase configuration - REPLACE WITH YOUR FIREBASE CONFIG
    this.firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
      databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT_ID.appspot.com",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID",
    };

    this.db = null;
    this.data = [];
    this.filteredData = [];
    this.isPaused = false;
    this.lastUpdateTime = null;
    this.unsubscribe = null;

    this.init();
  }

  init() {
    // Initialize Firebase
    try {
      firebase.initializeApp(this.firebaseConfig);
      this.db = firebase.database();
      console.log("Firebase Realtime Database initialized");
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      this.updateConnectionStatus("Error: Check Firebase config");
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

      const snapshot = await this.db
        .ref("crash_values")
        .limitToLast(1000)
        .once("value");
      const data = snapshot.val();

      this.data = [];
      if (data) {
        // Convert Firebase object to array and sort by created_at descending
        Object.keys(data).forEach((key) => {
          this.data.push({
            id: key,
            ...data[key],
          });
        });

        // Sort by created_at descending (newest first)
        this.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      }

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
    if (!this.db) return;

    // Listen for new data added to crash_values
    this.unsubscribe = this.db.ref("crash_values").on(
      "child_added",
      (snapshot) => {
        if (!this.isPaused) {
          const newRecord = {
            id: snapshot.key,
            ...snapshot.val(),
          };

          // Check if this record is already in our data (avoid duplicates on initial load)
          const exists = this.data.find((record) => record.id === newRecord.id);
          if (!exists) {
            console.log(
              "🔥 New crash value received in real-time:",
              newRecord.crash_value
            );

            // Add visual feedback for new data
            this.showNewDataNotification(newRecord.crash_value);

            this.data.unshift(newRecord);

            // Keep only last 1000 records
            if (this.data.length > 1000) {
              this.data = this.data.slice(0, 1000);
            }

            this.applyCurrentFilters();
            this.updateUI();
            this.lastUpdateTime = new Date();
            this.updateLastUpdateTime();

            // Update connection status to show live updates
            this.updateConnectionStatus("🟢 Live - Real-time updates active");
          }
        }
      },
      (error) => {
        console.error("Real-time listener error:", error);
        this.updateConnectionStatus("❌ Real-time Error - Using polling");

        // Fallback to polling
        this.setupPolling();
      }
    );

    // Set up connection state monitoring
    this.db.ref(".info/connected").on("value", (snapshot) => {
      if (snapshot.val() === true) {
        console.log("🔗 Connected to Firebase");
        this.updateConnectionStatus("🟢 Connected - Real-time active");
      } else {
        console.log("❌ Disconnected from Firebase");
        this.updateConnectionStatus("🔴 Disconnected - Reconnecting...");
      }
    });

    console.log("Real-time listener set up with connection monitoring");
  }

  setupPolling() {
    // Poll for new data every 5 seconds as fallback
    setInterval(async () => {
      if (!this.isPaused) {
        try {
          const snapshot = await this.db
            .ref("crash_values")
            .limitToLast(10)
            .once("value");
          const data = snapshot.val();

          if (data) {
            const latestKeys = Object.keys(data);
            const currentKeys = this.data
              .slice(0, 10)
              .map((record) => record.id);

            // Check if we have new records
            const hasNewData = latestKeys.some(
              (key) => !currentKeys.includes(key)
            );

            if (hasNewData) {
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
      .map((record, index) => {
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

        // Add highlight class for the newest record
        const highlightClass =
          index === 0 && this.lastUpdateTime ? "new-record" : "";

        return `
        <tr class="${highlightClass}">
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

    // Remove highlight after animation
    if (this.lastUpdateTime) {
      setTimeout(() => {
        const newRecord = tbody.querySelector(".new-record");
        if (newRecord) {
          newRecord.classList.remove("new-record");
        }
      }, 2000);
    }
  }

  showNewDataNotification(crashValue) {
    // Create a temporary notification element
    const notification = document.createElement("div");
    notification.className = "new-data-notification";
    notification.innerHTML = `
      <span class="notification-icon">🔥</span>
      <span class="notification-text">New crash: ${crashValue}</span>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add("show"), 100);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
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

  // Clean up listeners when page unloads
  destroy() {
    if (this.unsubscribe && this.db) {
      this.db.ref("crash_values").off("child_added", this.unsubscribe);
    }
  }
}

// Initialize the dashboard when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const dashboard = new CrashDashboard();

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    dashboard.destroy();
  });
});
