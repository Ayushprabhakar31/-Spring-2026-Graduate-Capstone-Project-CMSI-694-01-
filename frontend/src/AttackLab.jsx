import { useEffect, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

const PRESETS = [
  { id: "credential", title: "Credential Stuffing", payload: { path: "/login", method: "POST", status: 401, latency: 180, userAgent: "Credential-Stuffer/4.1" } },
  { id: "scraping", title: "Scraping Bot", payload: { path: "/products", method: "GET", status: 200, latency: 110, userAgent: "DataMiner-3/6.0" } },
  { id: "admin-probe", title: "Admin Probe", payload: { path: "/admin/config", method: "GET", status: 403, latency: 140, userAgent: "AttackBot-X/9.0" } },
  { id: "api-abuse", title: "API Abuse", payload: { path: "/api/orders", method: "POST", status: 429, latency: 220, userAgent: "Abuse-Client/3.0" } },
];

export default function AttackLab() {
  const [sites, setSites] = useState([]);
  const [siteKey, setSiteKey] = useState("");
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    async function loadSites() {
      const response = await fetch(`${API_BASE}/api/sites`);
      if (!response.ok) return;
      const data = await response.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setSites(rows);
      setSiteKey(rows[0]?.siteKey || "");
    }
    loadSites().catch(() => {});
  }, []);

  async function runPreset(preset) {
    if (!siteKey) return;
    setStatus(`Running ${preset.title}`);
    await fetch(`${API_BASE}/api/collect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteKey, apiKey: sites.find((site) => site.siteKey === siteKey)?.apiKey, region: "us-west", ...preset.payload }),
    });
    setStatus(`${preset.title} simulated`);
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Security Simulation</p>
          <h2>Attack Lab</h2>
          <p className="page-hero__copy">
            Launch preset attack flows against a monitored site so you can demo credential stuffing, scraping, admin probing, and API abuse on demand.
          </p>
        </div>
        <div className="war-room-hero__meta">
          <div className="signal-pill signal-pill--warning">
            <span>Status</span>
            <strong>{status}</strong>
          </div>
        </div>
      </section>

      <section className="studio-grid">
        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Target site</p>
              <h2>Preset launcher</h2>
            </div>
            <select className="site-select" value={siteKey} onChange={(event) => setSiteKey(event.target.value)}>
              {sites.map((site) => (
                <option key={site.siteKey} value={site.siteKey}>{site.name}</option>
              ))}
            </select>
          </div>
          <div className="resource-grid">
            {PRESETS.map((preset) => (
              <article key={preset.id} className="resource-card resource-card--warning">
                <div className="resource-card__tag">{preset.title}</div>
                <p>{preset.payload.method} {preset.payload.path}</p>
                <div className="quick-actions">
                  <button className="copilot-submit" type="button" onClick={() => runPreset(preset)}>Run Preset</button>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
