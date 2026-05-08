import { useEffect, useState } from "react";
import * as api from "./services/api";

export default function AdminConsole() {
  const [overview, setOverview] = useState({ users: [], webhooks: [], sharedReports: [], sites: [], deliveryLog: [], edgePolicies: [] });
  const [webhook, setWebhook] = useState({ channel: "slack", target: "", siteKey: "" });
  const [rawLog, setRawLog] = useState('127.0.0.1 - - [13/Apr/2026:18:15:00 +0000] "GET /admin/config HTTP/1.1" 403 512 "-" "AttackBot-X/9.0"');
  const [edgeSiteKey, setEdgeSiteKey] = useState("");
  const [edgePolicy, setEdgePolicy] = useState({
    securityMode: "balanced",
    wafMode: "simulate",
    rateLimitMode: "adaptive",
    botFightMode: "managed",
    cacheMode: "smart",
    underAttack: false,
  });

  async function loadOverview() {
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
    } catch {
      // local fallback
    }
  }

  useEffect(() => { loadOverview(); }, []);
  useEffect(() => {
    if (edgeSiteKey) return;
    const firstSiteKey = overview.sites[0]?.siteKey || "";
    if (!firstSiteKey) return;
    setEdgeSiteKey(firstSiteKey);
    const nextPolicy = overview.edgePolicies.find((item) => item.siteKey === firstSiteKey);
    if (nextPolicy) setEdgePolicy(nextPolicy);
  }, [edgeSiteKey, overview.edgePolicies, overview.sites]);

  async function handleCreateWebhook(event) {
    event.preventDefault();
    try {
      await api.createWebhook(webhook);
      setWebhook({ channel: "slack", target: "", siteKey: "" });
      loadOverview();
    } catch {
      // ignore
    }
  }

  async function handleIngestLog() {
    try {
      await api.ingestLog({ raw: rawLog, siteKey: webhook.siteKey || overview.sites[0]?.siteKey });
      loadOverview();
    } catch {
      // ignore
    }
  }

  async function handleRotateKey(siteKey) {
    try {
      await api.rotateSiteKey(siteKey);
      loadOverview();
    } catch {
      // ignore
    }
  }

  async function handleSaveEdgePolicy(event) {
    event.preventDefault();
    if (!edgeSiteKey) return;
    try {
      const data = await api.updateEdgeConfig(edgeSiteKey, edgePolicy);
      setEdgePolicy(data.policy);
      loadOverview();
    } catch {
      // ignore
    }
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
          <form className="site-form" onSubmit={handleCreateWebhook}>
            <select className="site-select" value={webhook.channel} onChange={(e) => setWebhook((c) => ({ ...c, channel: e.target.value }))}>
              <option value="slack">Slack</option>
              <option value="discord">Discord</option>
              <option value="email">Email</option>
            </select>
            <input className="copilot-input query-input" placeholder="Destination or webhook URL" value={webhook.target} onChange={(e) => setWebhook((c) => ({ ...c, target: e.target.value }))} />
            <select className="site-select" value={webhook.siteKey} onChange={(e) => setWebhook((c) => ({ ...c, siteKey: e.target.value }))}>
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
          <textarea className="code-block-input" value={rawLog} onChange={(e) => setRawLog(e.target.value)} />
          <div className="quick-actions">
            <button className="copilot-submit" onClick={handleIngestLog} type="button">Ingest Log Line</button>
          </div>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Edge controls</p>
              <h2>Cloudflare-style site policy</h2>
            </div>
          </div>
          <form className="site-form" onSubmit={handleSaveEdgePolicy}>
            <select
              className="site-select"
              value={edgeSiteKey}
              onChange={(e) => {
                const nextSiteKey = e.target.value;
                setEdgeSiteKey(nextSiteKey);
                const nextPolicy = overview.edgePolicies.find((item) => item.siteKey === nextSiteKey);
                if (nextPolicy) setEdgePolicy(nextPolicy);
              }}
            >
              {overview.sites.map((site) => (
                <option key={site.siteKey} value={site.siteKey}>{site.name}</option>
              ))}
            </select>
            <select className="site-select" value={edgePolicy.securityMode} onChange={(e) => setEdgePolicy((c) => ({ ...c, securityMode: e.target.value }))}>
              <option value="relaxed">Security mode: Relaxed</option>
              <option value="balanced">Security mode: Balanced</option>
              <option value="strict">Security mode: Strict</option>
            </select>
            <select className="site-select" value={edgePolicy.wafMode} onChange={(e) => setEdgePolicy((c) => ({ ...c, wafMode: e.target.value }))}>
              <option value="off">WAF: Off</option>
              <option value="simulate">WAF: Simulate</option>
              <option value="block">WAF: Block</option>
            </select>
            <select className="site-select" value={edgePolicy.rateLimitMode} onChange={(e) => setEdgePolicy((c) => ({ ...c, rateLimitMode: e.target.value }))}>
              <option value="basic">Rate limit: Basic</option>
              <option value="adaptive">Rate limit: Adaptive</option>
              <option value="aggressive">Rate limit: Aggressive</option>
            </select>
            <select className="site-select" value={edgePolicy.botFightMode} onChange={(e) => setEdgePolicy((c) => ({ ...c, botFightMode: e.target.value }))}>
              <option value="observe">Bot fight: Observe</option>
              <option value="managed">Bot fight: Managed</option>
              <option value="super">Bot fight: Super</option>
            </select>
            <select className="site-select" value={edgePolicy.cacheMode} onChange={(e) => setEdgePolicy((c) => ({ ...c, cacheMode: e.target.value }))}>
              <option value="off">Cache: Off</option>
              <option value="smart">Cache: Smart</option>
              <option value="cache-everything">Cache: Cache Everything</option>
            </select>
            <label className="checklist-row">
              <input checked={Boolean(edgePolicy.underAttack)} onChange={() => setEdgePolicy((c) => ({ ...c, underAttack: !c.underAttack }))} type="checkbox" />
              <span>Enable under-attack mode for stricter edge posture and origin shielding.</span>
            </label>
            <button className="copilot-submit" type="submit">Save Edge Policy</button>
          </form>
        </article>

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
                <button className="copilot-submit" type="button" onClick={() => handleRotateKey(site.siteKey)}>Rotate Key</button>
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
