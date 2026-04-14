import { useEffect, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

export default function AnalyticsHub() {
  const [sites, setSites] = useState([]);
  const [siteKey, setSiteKey] = useState("global");
  const [history, setHistory] = useState({ rows: [], trends: {}, anomalyScore: 0 });
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    async function loadSites() {
      try {
        const response = await fetch(`${API_BASE}/api/sites`);
        if (!response.ok) return;
        const data = await response.json();
        setSites(Array.isArray(data.rows) ? data.rows : []);
      } catch (error) {
        // local fallback
      }
    }

    loadSites();
  }, []);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [historyResponse, comparisonResponse] = await Promise.all([
          fetch(`${API_BASE}/api/history/overview?siteKey=${encodeURIComponent(siteKey)}`),
          fetch(`${API_BASE}/api/history/incidents/compare`),
        ]);
        if (historyResponse.ok) setHistory(await historyResponse.json());
        if (comparisonResponse.ok) setComparison(await comparisonResponse.json());
      } catch (error) {
        // local fallback
      }
    }

    loadAnalytics();
  }, [siteKey]);

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Historical Analytics</p>
          <h2>Analytics Hub</h2>
          <p className="page-hero__copy">
            View historical trends, anomaly scoring, security score movement, and compare the current incident window with earlier windows.
          </p>
        </div>
        <select className="site-select" value={siteKey} onChange={(event) => setSiteKey(event.target.value)}>
          <option value="global">Global Platform</option>
          {sites.map((site) => (
            <option key={site.siteKey} value={site.siteKey}>{site.name}</option>
          ))}
        </select>
      </section>

      <section className="metric-grid">
        <article className={`metric-card metric-card--${history.anomalyScore >= 70 ? "danger" : history.anomalyScore >= 35 ? "warning" : "success"}`}>
          <div className="metric-card__eyebrow">Anomaly score</div>
          <div className="metric-card__value">{history.anomalyScore || 0}</div>
          <p className="metric-card__detail">Simple baseline-driven anomaly signal</p>
        </article>
        <article className="metric-card metric-card--info">
          <div className="metric-card__eyebrow">Latency trend</div>
          <div className="metric-card__value">{history.trends?.currentLatency || 0}ms</div>
          <p className="metric-card__detail">Previous {history.trends?.previousLatency || 0}ms</p>
        </article>
        <article className="metric-card metric-card--warning">
          <div className="metric-card__eyebrow">Threat trend</div>
          <div className="metric-card__value">{history.trends?.currentThreat || 0}</div>
          <p className="metric-card__detail">Previous {history.trends?.previousThreat || 0}</p>
        </article>
        <article className="metric-card metric-card--violet">
          <div className="metric-card__eyebrow">Risk trend</div>
          <div className="metric-card__value">{history.trends?.currentRisk || 0}</div>
          <p className="metric-card__detail">Previous {history.trends?.previousRisk || 0}</p>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Trend points</p>
              <h2>Historical windows</h2>
            </div>
          </div>
          <div className="service-list">
            {history.rows.slice(-12).reverse().map((row) => (
              <div key={row.ts} className="service-row service-row--info">
                <div>
                  <strong>{new Date(row.ts).toLocaleTimeString()}</strong>
                  <span>{row.latency}ms latency · {row.errorRate}% error</span>
                </div>
                <div className="service-row__status">{Math.round(row.riskScore || 0)} risk</div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Incident comparison</p>
              <h2>Latest vs previous window</h2>
            </div>
          </div>
          <div className="report-card">
            <p><strong>Latest:</strong> {comparison ? `${comparison.latestWindow.latency}ms latency, ${comparison.latestWindow.errorRate}% error, ${comparison.latestWindow.riskScore} risk` : "Waiting for comparison data."}</p>
            <p><strong>Previous:</strong> {comparison ? `${comparison.previousWindow.latency}ms latency, ${comparison.previousWindow.errorRate}% error, ${comparison.previousWindow.riskScore} risk` : "Waiting for comparison data."}</p>
            <p><strong>Scenario:</strong> {comparison?.currentScenario || "Normal Ops"}</p>
          </div>
        </article>
      </section>
    </main>
  );
}
