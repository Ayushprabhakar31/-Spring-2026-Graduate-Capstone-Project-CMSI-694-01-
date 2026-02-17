import React, { useEffect, useState } from "react";
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

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

const API_URL = "http://127.0.0.1:9000";

function App() {
  const [apiKey, setApiKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  // -----------------------------------------
  // Fetch Metrics
  // -----------------------------------------
  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_URL}/metrics`, {
        headers: { "x-api-key": apiKey },
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Invalid API key");
        setConnected(false);
        return;
      }

      const data = await res.json();
      setMetrics(data);
      setError(null);

      setHistory((prev) => [
        ...prev.slice(-19),
        {
          time: new Date().toLocaleTimeString(),
          requests: data.total_requests,
          rateLimited: data.rate_limited_requests,
        },
      ]);
    } catch (err) {
      console.error("Metrics fetch error:", err);
      setError("Server not reachable");
    }
  };

  // -----------------------------------------
  // Fetch Health
  // -----------------------------------------
  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({ status: "down" });
    }
  };

  // -----------------------------------------
  // Polling
  // -----------------------------------------
  useEffect(() => {
    if (connected) {
      fetchMetrics();
      fetchHealth();

      const interval = setInterval(() => {
        fetchMetrics();
        fetchHealth();
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [connected]);

  // -----------------------------------------
  // Login Screen
  // -----------------------------------------
  if (!connected) {
    return (
      <div className="login-container">
        <h1>Enter API Key</h1>

        {error && <p className="error">{error}</p>}

        <input
          placeholder="Paste API Key here"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />

        <button
          onClick={() => {
            if (!apiKey.trim()) {
              setError("Please enter API key");
              return;
            }
            setHistory([]);
            setMetrics(null);
            setConnected(true);
          }}
        >
          Connect
        </button>
      </div>
    );
  }

  if (!metrics) return <div className="loading">Loading...</div>;

  // -----------------------------------------
  // Chart Data
  // -----------------------------------------
  const chartData = {
    labels: history.map((h) => h.time),
    datasets: [
      {
        label: "Total Requests",
        data: history.map((h) => h.requests),
        borderColor: "#4F9DFF",
        backgroundColor: "rgba(79,157,255,0.2)",
        tension: 0.3,
      },
      {
        label: "Rate Limited",
        data: history.map((h) => h.rateLimited),
        borderColor: "#FF4D4D",
        backgroundColor: "rgba(255,77,77,0.2)",
        tension: 0.3,
      },
    ],
  };

  // -----------------------------------------
  // Dashboard UI
  // -----------------------------------------
  return (
    <div className={darkMode ? "app dark" : "app"}>
      <header>
        <h1>API Gateway Dashboard</h1>
        <div>
          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "Light Mode ☀️" : "Dark Mode 🌙"}
          </button>
          <button
            style={{ marginLeft: "10px" }}
            onClick={() => {
              setConnected(false);
              setApiKey("");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="cards">
        <MetricCard title="Total Requests" value={metrics.total_requests} />
        <MetricCard
          title="Rate Limited"
          value={metrics.rate_limited_requests}
          alert={metrics.rate_limited_requests > 0}
        />
        <MetricCard
          title="Avg Latency (ms)"
          value={metrics.average_latency_ms}
        />
        <MetricCard
          title="P95 Latency (ms)"
          value={metrics.p95_latency_ms}
        />
      </div>

      <div className="chart-container">
        <Line data={chartData} />
      </div>

      <div className="health">
        <span>System Status:</span>
        {health?.status === "healthy" ? (
          <span className="status-ok"> ● Healthy</span>
        ) : (
          <span className="status-down"> ● Down</span>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, alert }) {
  return (
    <div className={`card ${alert ? "card-alert" : ""}`}>
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}

export default App;