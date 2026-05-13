import { useEffect, useState } from "react";
import * as api from "./services/api";
import useSites from "./hooks/useSites";
import { SkeletonCard, SkeletonPanel } from "./components/Skeleton";
import { API_BASE } from "./config";

export default function AnalyticsHub() {
  const { sites } = useSites();
  const [siteKey, setSiteKey] = useState("global");
  const [history, setHistory] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let eventSource = null;
    let intervalId = null;

    async function loadAnalytics() {
      try {
        const [historyData, comparisonData] = await Promise.all([
          api.getHistoryOverview(siteKey),
          api.getIncidentComparison(),
        ]);
        if (!cancelled) {
          setHistory(historyData);
          setComparison(comparisonData);
          setLoadError("");
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError("Analytics data is unavailable right now. Check that the backend is running and telemetry is flowing.");
          setLoading(false);
        }
      }
    }

    setLoading(true);
    loadAnalytics().catch(() => {});
    intervalId = window.setInterval(() => {
      loadAnalytics().catch(() => {});
    }, 2000);

    if (typeof EventSource === "function") {
      try {
        eventSource = new EventSource(`${API_BASE}/api/metrics/realtime`);
        eventSource.addEventListener("snapshot", () => {
          loadAnalytics().catch(() => {});
        });
      } catch (error) {
        // Polling stays active as the fallback path.
      }
    }

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      eventSource?.close();
    };
  }, [siteKey]);

  const hasHistory = Array.isArray(history?.rows) && history.rows.length > 0;
  const hasComparison = Boolean(comparison);

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
        <select className="site-select" value={siteKey} onChange={(e) => setSiteKey(e.target.value)}>
          <option value="global">Global Platform</option>
          {sites.map((site) => (
            <option key={site.siteKey} value={site.siteKey}>{site.name}</option>
          ))}
        </select>
      </section>

      {!loading && loadError ? (
        <section className="auth-status auth-status--warning">
          <strong>Analytics backend unavailable</strong>
          <p>{loadError}</p>
        </section>
      ) : null}

      {!loading && !loadError && !hasHistory ? (
        <section className="auth-status">
          <strong>No historical analytics yet</strong>
          <p>
            PulseOps has not collected enough historical windows for this view yet. Send live traffic, use the Website Monitor test actions,
            or wait a few refresh cycles for history to populate.
          </p>
        </section>
      ) : null}

      <section className="metric-grid">
        {loading ? (
          [1,2,3,4].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <article className={`metric-card metric-card--${history?.anomalyScore >= 70 ? "danger" : history?.anomalyScore >= 35 ? "warning" : "success"}`}>
              <div className="metric-card__eyebrow">Anomaly score</div>
              <div className="metric-card__value">{hasHistory ? history?.anomalyScore || 0 : "--"}</div>
              <p className="metric-card__detail">{hasHistory ? "Simple baseline-driven anomaly signal" : "Waiting for enough history to calculate anomalies"}</p>
            </article>
            <article className="metric-card metric-card--info">
              <div className="metric-card__eyebrow">Latency trend</div>
              <div className="metric-card__value">{hasHistory ? `${history?.trends?.currentLatency || 0}ms` : "--"}</div>
              <p className="metric-card__detail">{hasHistory ? `Previous ${history?.trends?.previousLatency || 0}ms` : "No latency baseline available yet"}</p>
            </article>
            <article className="metric-card metric-card--warning">
              <div className="metric-card__eyebrow">Threat trend</div>
              <div className="metric-card__value">{hasHistory ? history?.trends?.currentThreat || 0 : "--"}</div>
              <p className="metric-card__detail">{hasHistory ? `Previous ${history?.trends?.previousThreat || 0}` : "Threat movement will appear after telemetry accumulates"}</p>
            </article>
            <article className="metric-card metric-card--violet">
              <div className="metric-card__eyebrow">Risk trend</div>
              <div className="metric-card__value">{hasHistory ? history?.trends?.currentRisk || 0 : "--"}</div>
              <p className="metric-card__detail">{hasHistory ? `Previous ${history?.trends?.previousRisk || 0}` : "Risk history has not formed yet"}</p>
            </article>
          </>
        )}
      </section>

      <section className="studio-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Trend points</p>
              <h2>Historical windows</h2>
            </div>
          </div>
          {loading ? <SkeletonPanel rows={5} /> : (
            <div className="service-list">
              {(history?.rows || []).slice(-12).reverse().map((row) => (
                <div key={row.ts} className="service-row service-row--info">
                  <div>
                    <strong>{new Date(row.ts).toLocaleTimeString()}</strong>
                    <span>{row.latency}ms latency · {row.errorRate}% error</span>
                  </div>
                  <div className="service-row__status">{Math.round(row.riskScore || 0)} risk</div>
                </div>
              ))}
              {!hasHistory ? (
                <div className="service-row service-row--warning">
                  <div>
                    <strong>No historical windows yet</strong>
                    <span>Generate more live telemetry or wait for rolling history snapshots to build up.</span>
                  </div>
                  <div className="service-row__status">Pending</div>
                </div>
              ) : null}
            </div>
          )}
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Incident comparison</p>
              <h2>Latest vs previous window</h2>
            </div>
          </div>
          <div className="report-card">
            <p><strong>Latest:</strong> {hasComparison ? `${comparison.latestWindow.latency}ms latency, ${comparison.latestWindow.errorRate}% error, ${comparison.latestWindow.riskScore} risk` : "Waiting for comparison data."}</p>
            <p><strong>Previous:</strong> {hasComparison ? `${comparison.previousWindow.latency}ms latency, ${comparison.previousWindow.errorRate}% error, ${comparison.previousWindow.riskScore} risk` : "Waiting for comparison data."}</p>
            <p><strong>Scenario:</strong> {hasComparison ? comparison.currentScenario || "Normal Ops" : "Waiting for enough incident data."}</p>
          </div>
        </article>
      </section>
    </main>
  );
}
