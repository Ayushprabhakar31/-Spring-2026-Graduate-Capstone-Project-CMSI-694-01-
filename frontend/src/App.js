import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { FiHome, FiBarChart2, FiUsers, FiActivity } from "react-icons/fi";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [rateHistory, setRateHistory] = useState([]);
  const [section, setSection] = useState("dashboard");
  const [health, setHealth] = useState(null);
  const [connected, setConnected] = useState(true);
  const [apiKey, setApiKey] = useState(null);

  // ✅ NEW STATES (only additions)
  const [trafficVolume, setTrafficVolume] = useState(20);
  const [adminMode, setAdminMode] = useState(false);

  const prevRequests = useRef(0);

  // -------------------------
  // Auto Create API Key
  // -------------------------
  const createApiKey = async () => {
    const res = await fetch(`${API_URL}/register`, { method: "POST" });
    const data = await res.json();
    setApiKey(data.api_key);
  };

  // -------------------------
  // Generate Traffic
  // -------------------------
  const generateTraffic = async () => {
    if (!apiKey) return;

    for (let i = 0; i < trafficVolume; i++) {
      try {
        await fetch(`${API_URL}/`, {
          headers: {
            "x-api-key": apiKey,
            "x-admin-mode": adminMode ? "true" : "false",
          },
        });
      } catch (err) {
        console.log("Traffic request blocked");
      }
    }
  };

  const resetRateLimit = async () => {
    if (!apiKey) {
      console.log("No API key");
      return;
    }
  
    console.log("Sending reset request with key:", apiKey);
  
    try {
      const res = await fetch(`${API_URL}/reset-rate-limit`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "x-admin-mode": "true",
        },
      });
  
      const data = await res.json();
      console.log("Reset response:", data);
    } catch (err) {
      console.log("Reset failed:", err);
    }
  };

  // -------------------------
  // Fetch Metrics
  // -------------------------
  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_URL}/metrics`);
      const data = await res.json();

      const rps = data.total_requests - prevRequests.current;
      prevRequests.current = data.total_requests;

      setMetrics(data);

      setHistory((prev) => [
        ...prev.slice(-29),
        {
          time: new Date().toLocaleTimeString(),
          requests: data.total_requests,
        },
      ]);

      setRateHistory((prev) => [
        ...prev.slice(-29),
        {
          time: new Date().toLocaleTimeString(),
          rateLimited: data.rate_limited_requests,
          rps: rps,
        },
      ]);

      setConnected(true);
    } catch {
      setConnected(false);
    }
  };

  const fetchHealth = async () => {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    setHealth(data);
  };

  useEffect(() => {
    createApiKey();
    fetchMetrics();
    fetchHealth();
    const interval = setInterval(() => {
      fetchMetrics();
      fetchHealth();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <div className="loading">Loading...</div>;

  const trafficChart = {
    labels: history.map((h) => h.time),
    datasets: [
      {
        label: "Total Requests",
        data: history.map((h) => h.requests),
        borderColor: "#4F9DFF",
        backgroundColor: "rgba(79,157,255,0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const rateChart = {
    labels: rateHistory.map((h) => h.time),
    datasets: [
      {
        label: "Rate Limited",
        data: rateHistory.map((h) => h.rateLimited),
        borderColor: "#FF4D4D",
        backgroundColor: "rgba(255,77,77,0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <div className="app dark">
      <div className="sidebar">
        <div className="logo">AG</div>

        <SidebarItem
          icon={<FiHome />}
          label="Dashboard"
          active={section === "dashboard"}
          onClick={() => setSection("dashboard")}
        />
        <SidebarItem
          icon={<FiBarChart2 />}
          label="Metrics"
          active={section === "metrics"}
          onClick={() => setSection("metrics")}
        />
        <SidebarItem
          icon={<FiUsers />}
          label="Clients"
          active={section === "clients"}
          onClick={() => setSection("clients")}
        />
        <SidebarItem
          icon={<FiActivity />}
          label="Health"
          active={section === "health"}
          onClick={() => setSection("health")}
        />
      </div>

      <div className="main">
        <div className="live-indicator">
          <span className={connected ? "dot online" : "dot offline"}></span>
          {connected ? "Live" : "Disconnected"}
        </div>

        {section === "dashboard" && (
          <>
            <h1>Dashboard</h1>

            <div style={{ marginBottom: "20px" }}>
              <button onClick={generateTraffic}>
                Generate Traffic
              </button>

              <button
                onClick={resetRateLimit}
                style={{ marginLeft: "10px" }}
              >
                Reset Rate Limit
              </button>

              <div style={{ marginTop: "15px" }}>
                <label>Traffic Volume: {trafficVolume}</label>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={trafficVolume}
                  onChange={(e) =>
                    setTrafficVolume(Number(e.target.value))
                  }
                />
              </div>

              <div style={{ marginTop: "10px" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={adminMode}
                    onChange={() => setAdminMode(!adminMode)}
                  />
                  Admin Mode (Bypass Rate Limit)
                </label>
              </div>
            </div>

            <div className="cards">
              <MetricCard title="Total Requests" value={metrics.total_requests} />
              <MetricCard
                title="Requests Per 2s"
                value={rateHistory.length ? rateHistory.at(-1).rps : 0}
              />
              <MetricCard
                title="Rate Limited"
                value={metrics.rate_limited_requests}
                danger={metrics.rate_limited_requests > 0}
              />
              <MetricCard
                title="P95 Latency"
                value={metrics.p95_latency_ms}
                danger={metrics.p95_latency_ms > 200}
              />
            </div>
          </>
        )}

        {section === "metrics" && (
          <>
            <h1>Traffic</h1>
            <div className="chart-container">
              <Line data={trafficChart} />
            </div>

            <h2 style={{ marginTop: "30px" }}>Rate Limit Spikes</h2>
            <div className="chart-container">
              <Line data={rateChart} />
            </div>
          </>
        )}

        {section === "clients" && (
          <>
            <h1>Client Usage</h1>
            {Object.entries(metrics.client_usage).length === 0 ? (
              <p>No client traffic recorded.</p>
            ) : (
              Object.entries(metrics.client_usage).map(([key, value]) => (
                <div key={key} className="client-row">
                  <span>{key.slice(0, 8)}...</span>
                  <span>{value} requests</span>
                </div>
              ))
            )}
          </>
        )}

        {section === "health" && (
          <>
            <h1>System Health</h1>
            <p>Status: {health?.status}</p>
            <p>Redis Connected: {health?.redis_connected ? "Yes" : "No"}</p>
          </>
        )}
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <div
      className={`sidebar-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
    </div>
  );
}

function MetricCard({ title, value, danger }) {
  return (
    <div className={`card ${danger ? "danger" : ""}`}>
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}

export default App;