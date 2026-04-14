import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

export default function ThreatAtlas() {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`${API_BASE}/api/dashboard/snapshot`);
        if (response.ok) {
          setSnapshot(await response.json());
        }
      } catch (error) {
        // Quiet fallback for local demo mode.
      }
    }

    load();
  }, []);

  const regions = useMemo(() => snapshot?.regionDist || [], [snapshot]);
  const maxValue = Math.max(...regions.map((item) => item.value), 0);
  const threatIntel = snapshot?.threatIntel || [];
  const rateLimitEvents = snapshot?.rateLimitEvents || [];
  const suspiciousEvents = snapshot?.suspiciousEvents || [];
  const countries = useMemo(
    () => (snapshot?.requests || []).reduce((accumulator, request) => {
      const key = request.country || "Unknown";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {}),
    [snapshot],
  );
  const asns = useMemo(
    () => (snapshot?.requests || []).reduce((accumulator, request) => {
      const key = request.asn || "Unknown Network";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {}),
    [snapshot],
  );

  const hotspots = useMemo(
    () =>
      regions.map((region) => ({
        ...region,
        level: maxValue ? Math.round((region.value / maxValue) * 100) : 0,
      })),
    [maxValue, regions],
  );

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Threat Surface</p>
          <h2>Threat Atlas</h2>
          <p className="page-hero__copy">
            A richer global-style threat view for regional traffic hotspots, identified automation, and recent mitigation activity.
          </p>
        </div>
      </section>

      <section className="studio-grid">
        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Regional heatmap</p>
              <h2>Traffic pressure by region</h2>
            </div>
          </div>
          <div className="atlas-surface">
            <div className="atlas-surface__grid" />
            {hotspots.map((region, index) => (
              <div
                key={region.name}
                className="atlas-hotspot"
                style={{
                  top: `${18 + index * 16}%`,
                  left: `${18 + (index % 2) * 34}%`,
                  "--atlas-size": `${48 + region.level}px`,
                }}
              >
                <span>{region.name}</span>
                <strong>{region.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Threat signals</p>
              <h2>Observed automation</h2>
            </div>
          </div>
          <div className="resource-grid">
            {threatIntel.length ? threatIntel.map((item) => (
              <article key={item.name} className="resource-card resource-card--warning">
                <div className="resource-card__tag">{item.name}</div>
                <h3>{item.classification}</h3>
                <p>Risk: {item.risk}. Blocks: {item.blocked}.</p>
              </article>
            )) : (
              <article className="resource-card resource-card--info">
                <p>Threat intelligence will populate here once bot traffic is observed by the backend.</p>
              </article>
            )}
          </div>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Mitigation stream</p>
              <h2>Recent threat events</h2>
            </div>
          </div>
          <div className="threat-list">
            {rateLimitEvents.length ? rateLimitEvents.map((event) => (
              <div key={event.id} className="threat-row">
                <div>
                  <strong>{event.agentName}</strong>
                  <span>{event.endpoint}</span>
                </div>
                <div className="threat-row__meta">
                  <span>{event.action}</span>
                  <span>{new Date(event.ts).toLocaleTimeString()}</span>
                </div>
              </div>
            )) : (
              <div className="alert-card alert-card--success">
                <strong>No active mitigation stream</strong>
                <p>Recent threat events will appear here when the backend rate-limits hostile traffic.</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Global summary</p>
              <h2>Threat posture</h2>
            </div>
          </div>
          <div className="report-card">
            <p>
              Threat score is {snapshot?.threatScore ?? 0}/100 with {rateLimitEvents.length} recent mitigation events across {regions.length || 0} observed regions.
            </p>
          </div>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Country view</p>
              <h2>Threat origin summary</h2>
            </div>
          </div>
          <div className="service-list">
            {Object.entries(countries).map(([name, value]) => (
              <div key={name} className="service-row service-row--info">
                <div>
                  <strong>{name}</strong>
                  <span>Observed request origins</span>
                </div>
                <div className="service-row__status">{value}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">ASN view</p>
              <h2>Network concentration</h2>
            </div>
          </div>
          <div className="service-list">
            {Object.entries(asns).map(([name, value]) => (
              <div key={name} className="service-row service-row--warning">
                <div>
                  <strong>{name}</strong>
                  <span>Requests tied to this network</span>
                </div>
                <div className="service-row__status">{value}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Flagged traffic</p>
              <h2>Suspicious regional events</h2>
            </div>
          </div>
          <div className="threat-list">
            {suspiciousEvents.length ? suspiciousEvents.slice(0, 8).map((event) => (
              <div key={event.id} className="threat-row">
                <div>
                  <strong>{event.siteName || "Website"} · {event.agentName}</strong>
                  <span>{event.endpoint} · {event.warnings.join(", ")}</span>
                </div>
                <div className="threat-row__meta">
                  <span>{event.severity}</span>
                  <span>{new Date(event.ts).toLocaleTimeString()}</span>
                </div>
              </div>
            )) : (
              <div className="alert-card alert-card--success">
                <strong>No suspicious regional events</strong>
                <p>Threat events will appear here once malicious traffic is observed.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
