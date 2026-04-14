import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

function MiniBar({ label, value, max }) {
  const width = max ? Math.max(8, Math.round((value / max) * 100)) : 8;
  return (
    <div className="map-row">
      <div className="map-row__label">
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
      <div className="map-row__track">
        <div className="map-row__fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function StepCard({ index, title, active }) {
  return (
    <div className={`site-step-card ${active ? "is-active" : ""}`}>
      <span>{index}</span>
      <strong>{title}</strong>
    </div>
  );
}

export default function SiteWatch() {
  const [sites, setSites] = useState([]);
  const [selectedSiteKey, setSelectedSiteKey] = useState("");
  const [snippet, setSnippet] = useState("");
  const [overview, setOverview] = useState(null);
  const [form, setForm] = useState({ name: "", domain: "" });
  const [saving, setSaving] = useState(false);
  const [loadingSnippet, setLoadingSnippet] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [playbook, setPlaybook] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [huntQuery, setHuntQuery] = useState("find admin probes");
  const [huntResult, setHuntResult] = useState(null);

  const selectedSite = useMemo(
    () => sites.find((site) => site.siteKey === selectedSiteKey) || sites[0] || null,
    [selectedSiteKey, sites],
  );

  const loadSites = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sites`);
      if (!response.ok) return;
      const data = await response.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setSites(rows);
      setSelectedSiteKey((current) => current || rows[0]?.siteKey || "");
    } catch (error) {
      // quiet for local demo use
    }
  }, []);

  const loadSnippet = useCallback(async (siteKey) => {
    if (!siteKey) return;
    setLoadingSnippet(true);
    try {
      const response = await fetch(`${API_BASE}/api/sites/${siteKey}/snippet`);
      if (!response.ok) throw new Error("Failed to load snippet");
      const data = await response.json();
      setSnippet(data.snippet || "");
    } catch (error) {
      setSnippet("Unable to load the collector snippet right now.");
    } finally {
      setLoadingSnippet(false);
    }
  }, []);

  const loadOverview = useCallback(async (siteKey) => {
    if (!siteKey) return;
    setLoadingOverview(true);
    try {
      const response = await fetch(`${API_BASE}/api/sites/${siteKey}/overview`);
      if (!response.ok) throw new Error("Failed to load overview");
      const data = await response.json();
      setOverview(data);
      setPlaybook(data.playbook || null);
      setWeeklySummary(data.weeklySummary || null);
    } catch (error) {
      setOverview(null);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    loadSites().catch(() => {});
  }, [loadSites]);

  useEffect(() => {
    if (!selectedSiteKey) return;
    loadSnippet(selectedSiteKey).catch(() => {});
    loadOverview(selectedSiteKey).catch(() => {});
  }, [loadOverview, loadSnippet, selectedSiteKey]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadSites().catch(() => {});
      if (selectedSiteKey) loadOverview(selectedSiteKey).catch(() => {});
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [loadOverview, loadSites, selectedSiteKey]);

  async function registerSite(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/sites/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error("Failed to register site");
      const data = await response.json();
      setSites((current) => [data.site, ...current.filter((site) => site.siteKey !== data.site.siteKey)]);
      setSelectedSiteKey(data.site.siteKey);
      setSnippet(data.snippet || "");
      setForm({ name: "", domain: "" });
      loadOverview(data.site.siteKey).catch(() => {});
    } catch (error) {
      setSnippet("Site registration failed. Check the backend and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function sendBeacon(payload) {
    if (!selectedSite) return;
    await fetch(`${API_BASE}/api/collect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteKey: selectedSite.siteKey,
        apiKey: selectedSite.apiKey,
        region: "us-west",
        ...payload,
      }),
    });
    loadSites().catch(() => {});
    loadOverview(selectedSite.siteKey).catch(() => {});
  }

  async function generatePlaybook() {
    if (!selectedSite) return;
    const response = await fetch(`${API_BASE}/api/security/playbook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteKey: selectedSite.siteKey }),
    });
    if (response.ok) setPlaybook(await response.json());
  }

  async function generateWeeklySummary() {
    if (!selectedSite) return;
    const response = await fetch(`${API_BASE}/api/security/weekly-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteKey: selectedSite.siteKey }),
    });
    if (response.ok) setWeeklySummary(await response.json());
  }

  async function runThreatHunt(event) {
    event.preventDefault();
    if (!selectedSite || !huntQuery.trim()) return;
    const response = await fetch(`${API_BASE}/api/threat-hunt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteKey: selectedSite.siteKey, query: huntQuery }),
    });
    if (response.ok) setHuntResult(await response.json());
  }

  const riskTone = (overview?.riskScore || 0) >= 70 ? "danger" : (overview?.riskScore || 0) >= 35 ? "warning" : "success";
  const trustDist = overview?.trustDistribution || [];
  const countryDist = overview?.threatByCountry || [];
  const asnDist = overview?.threatByAsn || [];
  const suspiciousEvents = overview?.suspiciousEvents || [];
  const abuseTimeline = overview?.abuseTimeline || [];
  const replay = overview?.sessionReplay?.[0] || null;
  const socInbox = overview?.socInbox || [];
  const funnel = overview?.funnel || { human: [], bot: [] };
  const maxCountry = Math.max(...countryDist.map((item) => item.value), 0);
  const maxAsn = Math.max(...asnDist.map((item) => item.value), 0);
  const maxTrust = Math.max(...trustDist.map((item) => item.value), 0);
  const wizardSteps = overview?.onboarding || ["Register the website", "Copy the collector snippet", "Confirm telemetry", "Run a security test", "Review alerts"];

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">Website Monitoring</p>
          <h1>Website Guard</h1>
          <p className="hero-panel__lede">
            PulseOps can now act like a shared website security platform: onboard domains, collect traffic, separate humans from bots, score risk, run threat hunts, and generate AI-ready response guidance for each website.
          </p>
        </div>
      </section>

      <section className="metric-grid">
        <article className={`metric-card metric-card--${riskTone}`}>
          <div className="metric-card__eyebrow">Website risk score</div>
          <div className="metric-card__value">{overview?.riskScore ?? 0}/100</div>
          <p className="metric-card__detail">Live security posture for the selected website</p>
        </article>
        <article className="metric-card metric-card--info">
          <div className="metric-card__eyebrow">Monitored sites</div>
          <div className="metric-card__value">{sites.length}</div>
          <p className="metric-card__detail">Domains currently connected to PulseOps</p>
        </article>
        <article className="metric-card metric-card--warning">
          <div className="metric-card__eyebrow">Suspicious events</div>
          <div className="metric-card__value">{suspiciousEvents.length}</div>
          <p className="metric-card__detail">Current rolling window for the selected website</p>
        </article>
        <article className="metric-card metric-card--violet">
          <div className="metric-card__eyebrow">Trust classification</div>
          <div className="metric-card__value">{trustDist[0]?.name || "trusted"}</div>
          <p className="metric-card__detail">Top current traffic reputation tier</p>
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Onboarding wizard</p>
              <h2>Connect a website step by step</h2>
            </div>
          </div>
          <div className="site-step-grid">
            {wizardSteps.map((step, index) => (
              <StepCard
                key={step}
                index={index + 1}
                title={step}
                active={(index === 0 && !selectedSite) || (index === 1 && Boolean(selectedSite)) || (index > 1 && Boolean(overview))}
              />
            ))}
          </div>
          <form className="site-form" onSubmit={registerSite}>
            <input className="copilot-input query-input" placeholder="Website name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <input className="copilot-input query-input" placeholder="example.com" value={form.domain} onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))} />
            <button className="copilot-submit" type="submit">{saving ? "Registering..." : "Create Monitor"}</button>
          </form>
        </article>

        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Collector snippet</p>
              <h2>Copy into the monitored website</h2>
            </div>
            <select className="site-select" value={selectedSite?.siteKey || ""} onChange={(event) => setSelectedSiteKey(event.target.value)}>
              {sites.map((site) => (
                <option key={site.siteKey} value={site.siteKey}>{site.name}</option>
              ))}
            </select>
          </div>
          <textarea className="code-block-input" readOnly value={loadingSnippet ? "Loading snippet..." : snippet} />
          <div className="quick-actions">
            <button className="copilot-submit" type="button" onClick={() => navigator.clipboard?.writeText(snippet)}>Copy Snippet</button>
            <button className="scenario-chip" type="button" onClick={() => sendBeacon({ path: "/", method: "GET", status: 200, latency: 96, userAgent: "Mozilla/5.0 WebsiteMonitor" })}>Send Test Visit</button>
            <button className="scenario-chip" type="button" onClick={() => sendBeacon({ path: "/login", method: "POST", status: 401, latency: 160, userAgent: "Credential-Stuffer/4.1" })}>Simulate Auth Abuse</button>
            <button className="scenario-chip is-danger" type="button" onClick={() => sendBeacon({ path: "/wp-admin", method: "GET", status: 403, latency: 140, userAgent: "AttackBot-X/9.0" })}>Simulate Illegal Probe</button>
          </div>
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Browser SDK</p>
              <h2>Website package integration</h2>
            </div>
          </div>
          <div className="report-card">
            <p><strong>SDK script:</strong> `/sdk/pulseops.js`</p>
            <p>Supports `trackPageView()`, `trackApiError()`, and `trackEvent()` so a website can report activity with a reusable browser package instead of a raw snippet only.</p>
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">API key security</p>
              <h2>Collector credentials</h2>
            </div>
          </div>
          <div className="report-card">
            <p>Each monitored site now has its own API key. You can rotate keys from the Admin Console, and the generated snippet uses the current key automatically.</p>
          </div>
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Per-website drilldown</p>
              <h2>{selectedSite?.name || "Choose a site"}</h2>
            </div>
          </div>
          <div className="service-list">
            {sites.map((site) => (
              <button key={site.siteKey} type="button" className={`site-monitor-card ${selectedSite?.siteKey === site.siteKey ? "is-active" : ""}`} onClick={() => setSelectedSiteKey(site.siteKey)}>
                <strong>{site.name}</strong>
                <span>{site.domain}</span>
                <small>{site.requests || 0} reqs · {site.bots || 0} bots · {site.warnings || 0} warnings · risk {site.riskScore || 0}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Alert snapshot</p>
              <h2>What happened right now</h2>
            </div>
          </div>
          <div className="report-card">
            <h3>{overview?.alertSnapshot?.title || "No snapshot yet"}</h3>
            <p>{overview?.alertSnapshot?.summary || "Choose a site to load the current alert snapshot."}</p>
            <p><strong>Threat level:</strong> {overview?.alertSnapshot?.threatLevel || "Low"}</p>
            <p><strong>Suspicious count:</strong> {overview?.alertSnapshot?.suspiciousCount || 0}</p>
          </div>
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Visitor vs bot funnel</p>
              <h2>Behavior comparison</h2>
            </div>
          </div>
          <div className="resource-grid">
            <article className="resource-card resource-card--success">
              <div className="resource-card__tag">Human journey</div>
              {funnel.human.map((item) => <MiniBar key={item.stage} label={item.stage} value={item.value} max={Math.max(...funnel.human.map((row) => row.value), 0)} />)}
            </article>
            <article className="resource-card resource-card--warning">
              <div className="resource-card__tag">Bot journey</div>
              {funnel.bot.map((item) => <MiniBar key={item.stage} label={item.stage} value={item.value} max={Math.max(...funnel.bot.map((row) => row.value), 0)} />)}
            </article>
          </div>
        </article>

        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Session replay for attacks</p>
              <h2>Attacker path reconstruction</h2>
            </div>
          </div>
          {replay ? (
            <div className="replay-list">
              <div className="replay-row">
                <span className="replay-row__badge replay-row__badge--danger">{replay.actor}</span>
                <div>
                  <strong>{replay.reason}</strong>
                  <p>{replay.path.join(" -> ")}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="alert-card alert-card--info">
              <strong>No replay yet</strong>
              <p>Run an auth-abuse or illegal-probe simulation to reconstruct the attacker path.</p>
            </div>
          )}
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Abuse timeline</p>
              <h2>Suspicious sequence</h2>
            </div>
          </div>
          <div className="timeline-list">
            {abuseTimeline.length ? abuseTimeline.map((event) => (
              <div key={event.id} className={`timeline-row timeline-row--${event.severity}`}>
                <span className="timeline-row__dot" />
                <div>
                  <strong>{event.title}</strong>
                  <span>{new Date(event.ts).toLocaleTimeString()} · {event.detail}</span>
                </div>
              </div>
            )) : (
              <div className="alert-card alert-card--success">
                <strong>No abuse timeline yet</strong>
                <p>The timeline will populate when suspicious traffic appears for this website.</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Trust layer</p>
              <h2>Traffic reputation</h2>
            </div>
          </div>
          <div className="cause-list">
            {trustDist.map((item) => <MiniBar key={item.name} label={item.name} value={item.value} max={maxTrust} />)}
          </div>
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Country / ASN view</p>
              <h2>Origin intelligence</h2>
            </div>
          </div>
          <div className="resource-grid">
            <article className="resource-card resource-card--info">
              <div className="resource-card__tag">Countries</div>
              {countryDist.map((item) => <MiniBar key={item.name} label={item.name} value={item.value} max={maxCountry} />)}
            </article>
            <article className="resource-card resource-card--warning">
              <div className="resource-card__tag">Networks / ASN</div>
              {asnDist.map((item) => <MiniBar key={item.name} label={item.name} value={item.value} max={maxAsn} />)}
            </article>
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">SOC inbox</p>
              <h2>Analyst ticket queue</h2>
            </div>
          </div>
          <div className="service-list">
            {socInbox.length ? socInbox.map((ticket) => (
              <div key={ticket.id} className={`service-row service-row--${ticket.severity}`}>
                <div>
                  <strong>{ticket.title}</strong>
                  <span>{ticket.siteName}</span>
                  <span>{ticket.owner}</span>
                </div>
                <div className="service-row__status">{ticket.state}</div>
              </div>
            )) : (
              <div className="alert-card alert-card--info">
                <strong>SOC queue clear</strong>
                <p>No suspicious tickets are open for the selected website.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Threat hunt</p>
              <h2>Search suspicious behavior</h2>
            </div>
          </div>
          <form className="copilot-form" onSubmit={runThreatHunt}>
            <input className="copilot-input query-input" value={huntQuery} onChange={(event) => setHuntQuery(event.target.value)} />
            <div className="copilot-actions">
              {(overview?.huntCatalog || []).map((item) => (
                <button key={item} type="button" className="copilot-chip" onClick={() => setHuntQuery(`find ${item}`)}>
                  {item}
                </button>
              ))}
            </div>
            <button className="copilot-submit" type="submit">Run Hunt</button>
          </form>
          <div className="copilot-response">
            <p>{huntResult?.body || "Run hunts like 'find admin probes', 'find failed login attacks', or 'find malicious bots'."}</p>
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">AI weekly summary</p>
              <h2>Security recap</h2>
            </div>
            <button className="pause-button" onClick={generateWeeklySummary} type="button">Refresh Summary</button>
          </div>
          <div className="report-card">
            <h3>{weeklySummary?.title || "Weekly summary"}</h3>
            <p>{weeklySummary?.body || "Generate a weekly summary for the selected website."}</p>
            <div className="report-actions">
              {(weeklySummary?.takeaways || []).map((item) => (
                <div key={item} className="copilot-bullet">
                  <span className="insight-action__dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Auto-block recommendations</p>
              <h2>Attack playbook generator</h2>
            </div>
            <button className="pause-button" onClick={generatePlaybook} type="button">Refresh Playbook</button>
          </div>
          <div className="report-card">
            <h3>{playbook?.siteName || selectedSite?.name || "Selected website"}</h3>
            <p>{playbook?.summary || "Generate a playbook to get containment guidance for the selected website."}</p>
            <p><strong>Recommendation:</strong> {playbook?.recommendation || "No playbook loaded yet."}</p>
            <div className="report-actions">
              {(playbook?.actions || []).map((item) => (
                <div key={item} className="copilot-bullet">
                  <span className="insight-action__dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Selected site status</p>
              <h2>{selectedSite?.name || "Choose a site"}</h2>
            </div>
          </div>
          {loadingOverview ? (
            <div className="alert-card alert-card--info">
              <strong>Loading overview</strong>
              <p>Collecting per-website telemetry and threat intelligence.</p>
            </div>
          ) : (
            <div className="threat-list">
              {suspiciousEvents.length ? suspiciousEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="threat-row">
                  <div>
                    <strong>{event.agentName}</strong>
                    <span>{event.endpoint} · {event.warnings.join(", ")}</span>
                  </div>
                  <div className="threat-row__meta">
                    <span>{event.severity}</span>
                    <span>{new Date(event.ts).toLocaleTimeString()}</span>
                  </div>
                </div>
              )) : (
                <div className="alert-card alert-card--success">
                  <strong>No suspicious requests yet</strong>
                  <p>Run the test buttons above or connect a real website snippet to populate this drilldown.</p>
                </div>
              )}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
