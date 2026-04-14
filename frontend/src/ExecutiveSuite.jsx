import { useEffect, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

export default function ExecutiveSuite() {
  const [snapshot, setSnapshot] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    async function load() {
      const [snapshotResponse, reportResponse] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/snapshot`),
        fetch(`${API_BASE}/api/report`, { method: "POST" }),
      ]);

      if (snapshotResponse.ok) {
        setSnapshot(await snapshotResponse.json());
      }
      if (reportResponse.ok) {
        setReport(await reportResponse.json());
      }
    }

    load().catch(() => {});
  }, []);

  function exportExecutiveMemo() {
    const payload = {
      snapshot,
      report,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pulseops-executive-memo.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Stakeholder View</p>
          <h2>Executive Suite</h2>
          <p className="page-hero__copy">
            Business impact, incident posture, and board-ready summaries from the same live telemetry powering the command center.
          </p>
        </div>
      </section>

      <section className="studio-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Business impact</p>
              <h2>Executive summary</h2>
            </div>
          </div>
          {snapshot ? (
            <div className="report-card">
              <p>{snapshot.businessImpact?.summary}</p>
              <div className="report-actions">
                {snapshot.businessImpact?.statements?.map((item) => (
                  <div key={item} className="copilot-bullet">
                    <span className="insight-action__dot" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Generated brief</p>
              <h2>Board-ready report</h2>
            </div>
            <button className="pause-button" onClick={exportExecutiveMemo} type="button">Export memo</button>
          </div>
          {report ? (
            <div className="report-card">
              <h3>{report.title}</h3>
              <p><strong>Summary:</strong> {report.executiveSummary}</p>
              <p><strong>Impact:</strong> {report.impact}</p>
              <p><strong>Root cause:</strong> {report.rootCause}</p>
            </div>
          ) : null}
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">KPI layer</p>
              <h2>Strategic performance</h2>
            </div>
          </div>
          <div className="sla-grid">
            <div className="sla-card">
              <span>Health score</span>
              <strong>{snapshot?.totals?.healthScore ?? 100}/100</strong>
              <p>Single number for overall platform posture</p>
            </div>
            <div className="sla-card">
              <span>Threat score</span>
              <strong>{snapshot?.threatScore ?? 0}/100</strong>
              <p>Security and abuse pressure indicator</p>
            </div>
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Why it matters</p>
              <h2>Decision support</h2>
            </div>
          </div>
          <div className="report-card">
            <p>{snapshot?.businessImpact?.summary || "Business impact summary unavailable."}</p>
          </div>
        </article>
      </section>
    </main>
  );
}
