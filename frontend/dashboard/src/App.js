import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function App() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/metrics");
      const data = await res.json();
      setMetrics(data);

      setHistory((prev) => [
        ...prev.slice(-20),
        {
          time: new Date().toLocaleTimeString(),
          requests: data.total_requests,
        },
      ]);
    } catch (err) {
      console.error("Error fetching metrics:", err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <div style={theme.container}>
      <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} theme={theme} />

      <div style={theme.main}>
        <h1>API Gateway Dashboard</h1>

        {metrics && metrics.p95_latency_ms > 200 && (
          <div style={theme.alert}>
            ⚠ High Latency Detected (P95 &gt; 200ms)
          </div>
        )}

        {metrics && (
          <>
            <div style={theme.grid}>
              <MetricCard title="Total Requests" value={metrics.total_requests} theme={theme} />
              <MetricCard title="Success" value={metrics.success_count} theme={theme} />
              <MetricCard title="Errors" value={metrics.server_errors} theme={theme} />
              <MetricCard title="Rate Limited" value={metrics.rate_limited_requests} theme={theme} />
              <MetricCard title="Avg Latency (ms)" value={metrics.average_latency_ms} theme={theme} />
              <MetricCard title="P95 Latency (ms)" value={metrics.p95_latency_ms} theme={theme} />
            </div>

            <h2 style={{ marginTop: "40px" }}>📊 Traffic Over Time</h2>

            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke={darkMode ? "#00c3ff" : "#007bff"}
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <h2 style={{ marginTop: "40px" }}>👥 Client Usage</h2>
            <ClientTable data={metrics.client_usage} theme={theme} />
          </>
        )}
      </div>
    </div>
  );
}

function Sidebar({ darkMode, setDarkMode, theme }) {
  return (
    <div style={theme.sidebar}>
      <h2>Gateway</h2>
      <p>Dashboard</p>
      <p>Metrics</p>
      <p>Clients</p>

      <button
        style={theme.toggleButton}
        onClick={() => setDarkMode(!darkMode)}
      >
        Toggle {darkMode ? "Light" : "Dark"} Mode
      </button>
    </div>
  );
}

function MetricCard({ title, value, theme }) {
  return (
    <div style={theme.card}>
      <h4>{title}</h4>
      <h2>{value}</h2>
    </div>
  );
}

function ClientTable({ data, theme }) {
  const clients = Object.entries(data || {});

  return (
    <table style={theme.table}>
      <thead>
        <tr>
          <th>API Key</th>
          <th>Requests</th>
        </tr>
      </thead>
      <tbody>
        {clients.map(([key, value]) => (
          <tr key={key}>
            <td>{key.slice(0, 8)}...</td>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const lightTheme = {
  container: { display: "flex", background: "#f4f6f8", color: "#000", minHeight: "100vh" },
  main: { padding: "40px", flex: 1 },
  sidebar: {
    width: "220px",
    padding: "30px",
    background: "#ffffff",
    borderRight: "1px solid #ddd",
  },
  toggleButton: {
    marginTop: "20px",
    padding: "10px",
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "#ffffff",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
    transition: "0.3s",
  },
  alert: {
    background: "#ffe0e0",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
};

const darkTheme = {
  ...lightTheme,
  container: { display: "flex", background: "#121212", color: "#fff", minHeight: "100vh" },
  sidebar: {
    width: "220px",
    padding: "30px",
    background: "#1e1e1e",
    borderRight: "1px solid #333",
  },
  card: {
    background: "#1e1e1e",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
  },
};

export default App;