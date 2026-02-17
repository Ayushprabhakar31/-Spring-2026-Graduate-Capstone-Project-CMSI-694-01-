
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
import React, { useEffect, useState } from "react";

function App() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8001/metrics")
      .then((res) => res.json())
      .then((data) => setMetrics(data))
      .catch((err) => console.error(err));
  }, []);

  if (!metrics) {
    return <div style={{ padding: "20px" }}>Loading metrics...</div>;
  }

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>API Gateway Traffic Dashboard</h1>

      <h3>Overview</h3>
      <p><strong>Total Requests:</strong> {metrics.total_requests}</p>
      <p><strong>Rate-Limited Requests:</strong> {metrics.rate_limited_requests}</p>
      <p><strong>Average Latency (ms):</strong> {metrics.average_latency_ms}</p>
      <p><strong>Persisted Events:</strong> {metrics.persisted_events}</p>

      <h3>Endpoint Hits</h3>
      <ul>
        {Object.entries(metrics.endpoint_hits).map(([endpoint, count]) => (
          <li key={endpoint}>
            {endpoint}: {count}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
