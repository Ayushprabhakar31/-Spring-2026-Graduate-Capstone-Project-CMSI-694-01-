import { useEffect, useMemo, useState } from "react";
import * as api from "./services/api";
import useSites from "./hooks/useSites";
import { SkeletonPanel } from "./components/Skeleton";

export default function SecurityAnalyst() {
  const { sites } = useSites();
  const [siteKey, setSiteKey] = useState("");
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!siteKey && sites.length) setSiteKey(sites[0].siteKey);
  }, [sites, siteKey]);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    async function loadOverview() {
      try {
        const data = await api.getSiteOverview(siteKey);
        if (!cancelled) {
          setOverview(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    loadOverview().catch(() => {});
    const intervalId = window.setInterval(() => {
      loadOverview().catch(() => {});
    }, 6000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [siteKey]);

  const site = useMemo(() => sites.find((item) => item.siteKey === siteKey), [siteKey, sites]);

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">AI Security Analyst</p>
          <h2>Attack Intelligence Desk</h2>
          <p className="page-hero__copy">
            A focused security workspace for one monitored website at a time: attack posture, AI response playbook, SOC queue, and weekly summary.
          </p>
        </div>
        <select className="site-select" value={siteKey} onChange={(e) => setSiteKey(e.target.value)}>
          {sites.map((item) => (
            <option key={item.siteKey} value={item.siteKey}>{item.name}</option>
          ))}
        </select>
      </section>

      <section className="studio-grid">
        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Current target</p>
              <h2>{site?.name || "No website selected"}</h2>
            </div>
          </div>
          {loading ? <SkeletonPanel rows={3} /> : (
            <div className="report-card">
              <p><strong>Risk score:</strong> {overview?.riskScore ?? 0}/100</p>
              <p><strong>Summary:</strong> {overview?.playbook?.summary || "Select a website to load security analysis."}</p>
              <p><strong>Recommendation:</strong> {overview?.playbook?.recommendation || "Waiting for site overview."}</p>
            </div>
          )}
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">AI playbook</p>
              <h2>Containment guidance</h2>
            </div>
          </div>
          <div className="report-actions">
            {(overview?.playbook?.actions || []).map((item) => (
              <div key={item} className="copilot-bullet">
                <span className="insight-action__dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">SOC inbox</p>
              <h2>Open security work</h2>
            </div>
          </div>
          {loading ? <SkeletonPanel rows={4} /> : (
            <div className="service-list">
              {(overview?.socInbox || []).map((ticket) => (
                <div key={ticket.id} className={`service-row service-row--${ticket.severity}`}>
                  <div>
                    <strong>{ticket.title}</strong>
                    <span>{ticket.owner}</span>
                  </div>
                  <div className="service-row__status">{ticket.state}</div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Weekly summary</p>
              <h2>Security recap</h2>
            </div>
          </div>
          <div className="report-card">
            <h3>{overview?.weeklySummary?.title || "Weekly summary"}</h3>
            <p>{overview?.weeklySummary?.body || "Waiting for selected website data."}</p>
          </div>
        </article>
      </section>
    </main>
  );
}
