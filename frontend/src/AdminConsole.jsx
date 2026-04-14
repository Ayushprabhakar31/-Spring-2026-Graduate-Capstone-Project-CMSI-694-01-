import { useEffect, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

export default function AdminConsole() {
  const [overview, setOverview] = useState({ users: [], webhooks: [], sharedReports: [], sites: [], deliveryLog: [] });
  const [webhook, setWebhook] = useState({ channel: "slack", target: "", siteKey: "" });
  const [rawLog, setRawLog] = useState('127.0.0.1 - - [13/Apr/2026:18:15:00 +0000] "GET /admin/config HTTP/1.1" 403 512 "-" "AttackBot-X/9.0"');

  async function loadOverview() {
    try {
      const response = await fetch(`${API_BASE}/api/admin/overview`);
      if (!response.ok) return;
      setOverview(await response.json());
    } catch (error) {
      // local fallback
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function createWebhook(event) {
    event.preventDefault();
    await fetch(`${API_BASE}/api/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhook),
    });
    setWebhook({ channel: "slack", target: "", siteKey: "" });
    loadOverview();
  }

  async function ingestLog() {
    await fetch(`${API_BASE}/api/logs/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: rawLog, siteKey: webhook.siteKey || overview.sites[0]?.siteKey }),
    });
    loadOverview();
  }

  async function rotateKey(siteKey) {
    await fetch(`${API_BASE}/api/sites/${siteKey}/rotate-key`, { method: "POST" });
    loadOverview();
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Admin Control</p>
          <h2>Admin Console</h2>
          <p className="page-hero__copy">
            Manage users, websites, API keys, webhooks, shared reports, and imported logs from one operator-facing control surface.
          </p>
        </div>
      </section>

      <section className="studio-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Webhook alerts</p>
              <h2>Create destinations</h2>
            </div>
          </div>
          <form className="site-form" onSubmit={createWebhook}>
            <select className="site-select" value={webhook.channel} onChange={(event) => setWebhook((current) => ({ ...current, channel: event.target.value }))}>
              <option value="slack">Slack</option>
              <option value="discord">Discord</option>
              <option value="email">Email</option>
            </select>
            <input className="copilot-input query-input" placeholder="Destination or webhook URL" value={webhook.target} onChange={(event) => setWebhook((current) => ({ ...current, target: event.target.value }))} />
            <select className="site-select" value={webhook.siteKey} onChange={(event) => setWebhook((current) => ({ ...current, siteKey: event.target.value }))}>
              <option value="">All sites</option>
              {overview.sites.map((site) => (
                <option key={site.siteKey} value={site.siteKey}>{site.name}</option>
              ))}
            </select>
            <button className="copilot-submit" type="submit">Create Webhook</button>
          </form>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Log ingestion</p>
              <h2>Import Nginx / Express logs</h2>
            </div>
          </div>
          <textarea className="code-block-input" value={rawLog} onChange={(event) => setRawLog(event.target.value)} />
          <div className="quick-actions">
            <button className="copilot-submit" onClick={ingestLog} type="button">Ingest Log Line</button>
          </div>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Sites</p>
              <h2>API key management</h2>
            </div>
          </div>
          <div className="service-list">
            {overview.sites.map((site) => (
              <div key={site.siteKey} className="service-row service-row--info">
                <div>
                  <strong>{site.name}</strong>
                  <span>{site.domain}</span>
                  <span>{site.apiKey || "Hidden key"}</span>
                </div>
                <button className="copilot-submit" type="button" onClick={() => rotateKey(site.siteKey)}>Rotate Key</button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Users</p>
              <h2>Workspace accounts</h2>
            </div>
          </div>
          <div className="service-list">
            {overview.users.map((user) => (
              <div key={user.email} className="service-row service-row--success">
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <div className="service-row__status">{user.role}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Shared reports</p>
              <h2>Report links</h2>
            </div>
          </div>
          <div className="service-list">
            {overview.sharedReports.map((report) => (
              <div key={report.id} className="service-row service-row--warning">
                <div>
                  <strong>{report.title}</strong>
                  <span>{report.id}</span>
                </div>
                <div className="service-row__status">{new Date(report.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Webhook deliveries</p>
              <h2>Alert stream</h2>
            </div>
          </div>
          <div className="threat-list">
            {overview.deliveryLog.map((entry) => (
              <div key={entry.id} className="threat-row">
                <div>
                  <strong>{entry.channel}</strong>
                  <span>{entry.target}</span>
                </div>
                <div className="threat-row__meta">
                  <span>{entry.siteKey}</span>
                  <span>{new Date(entry.ts).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
