import { useEffect, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ExportCenter() {
  const [snapshot, setSnapshot] = useState(null);
  const [report, setReport] = useState(null);
  const [briefingPack, setBriefingPack] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [shared, setShared] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [snapshotResponse, reportResponse, briefingResponse] = await Promise.all([
          fetch(`${API_BASE}/api/dashboard/snapshot`),
          fetch(`${API_BASE}/api/report`, { method: "POST" }),
          fetch(`${API_BASE}/api/briefing-pack`),
        ]);

        if (snapshotResponse.ok) setSnapshot(await snapshotResponse.json());
        if (reportResponse.ok) setReport(await reportResponse.json());
        if (briefingResponse.ok) setBriefingPack(await briefingResponse.json());
        setStatus("Loaded");
      } catch (error) {
        setStatus("Offline");
      }
    }

    load();
  }, []);

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Delivery Hub</p>
          <h2>Export Center</h2>
          <p className="page-hero__copy">
            Package the project for demos, handoffs, and reports with one-click exports for telemetry, incident narratives, and executive communication.
          </p>
        </div>
        <div className="war-room-hero__meta">
          <div className="signal-pill signal-pill--info">
            <span>Status</span>
            <strong>{status}</strong>
          </div>
        </div>
      </section>

      <section className="studio-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">One-click exports</p>
              <h2>Download assets</h2>
            </div>
          </div>
          <div className="resource-grid">
            <article className="resource-card resource-card--info">
              <div className="resource-card__tag">Telemetry</div>
              <h3>Snapshot export</h3>
              <p>Capture the live system state as JSON for demos, debugging, or future adapters.</p>
              <div className="quick-actions">
                <button className="copilot-submit" onClick={() => downloadJson("pulseops-snapshot.json", snapshot)} type="button">Download Snapshot</button>
                <button
                  className="scenario-chip"
                  onClick={() => downloadCsv("pulseops-snapshot.csv", [["Metric", "Value"], ["Health", snapshot?.totals?.healthScore || 0], ["Latency", snapshot?.totals?.avgLatency || 0], ["Error Rate", snapshot?.totals?.errorRate || 0]])}
                  type="button"
                >
                  Download CSV
                </button>
              </div>
            </article>
            <article className="resource-card resource-card--warning">
              <div className="resource-card__tag">Operations</div>
              <h3>Incident report</h3>
              <p>Export the generated incident brief with summary, impact, likely cause, and next actions.</p>
              <div className="quick-actions">
                <button className="copilot-submit" onClick={() => downloadJson("pulseops-incident-report.json", report)} type="button">Download Report</button>
                <button
                  className="scenario-chip"
                  onClick={async () => {
                    const response = await fetch(`${API_BASE}/api/share/report`, { method: "POST" });
                    if (response.ok) setShared(await response.json());
                  }}
                  type="button"
                >
                  Create Share Link
                </button>
              </div>
            </article>
            <article className="resource-card resource-card--success">
              <div className="resource-card__tag">Presentation</div>
              <h3>Briefing pack</h3>
              <p>Export demo talking points, operator checklist, narration, and role cards.</p>
              <div className="quick-actions">
                <button className="copilot-submit" onClick={() => downloadJson("pulseops-briefing-pack.json", briefingPack)} type="button">Download Briefing Pack</button>
              </div>
            </article>
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Ready to share</p>
              <h2>Export checklist</h2>
            </div>
          </div>
          <div className="checklist">
            {[
              "Snapshot downloaded for technical evidence",
              "Incident report exported for operations narrative",
              "Briefing pack exported for presentation support",
              "Executive memo available from Executive Suite",
            ].map((item) => (
              <div key={item} className="checklist-row">
                <span>{item}</span>
              </div>
            ))}
          </div>
          {shared ? (
            <div className="report-card">
              <h3>Shared report link</h3>
              <p>{shared.url}</p>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
