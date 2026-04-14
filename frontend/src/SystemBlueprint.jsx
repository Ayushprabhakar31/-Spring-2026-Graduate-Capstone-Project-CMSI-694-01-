import { useEffect, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

export default function SystemBlueprint() {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/snapshot`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setSnapshot(data))
      .catch(() => {});
  }, []);

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">System Design</p>
          <h2>Platform Blueprint</h2>
          <p className="page-hero__copy">
            A visual breakdown of the capstone architecture, platform layers, and operational subsystems behind PulseOps.
          </p>
        </div>
      </section>

      <section className="studio-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Architecture</p>
              <h2>System layers</h2>
            </div>
          </div>
          <div className="architecture-grid">
            {snapshot?.architecture
              ? Object.entries(snapshot.architecture).map(([layer, nodes]) => (
                  <article key={layer} className="resource-card resource-card--success">
                    <div className="resource-card__tag">{layer}</div>
                    <div className="resource-chip-row">
                      {nodes.map((node) => (
                        <span key={node} className="resource-chip">
                          {node}
                        </span>
                      ))}
                    </div>
                  </article>
                ))
              : null}
          </div>
        </article>

        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Platform tools</p>
              <h2>What makes it production-like</h2>
            </div>
          </div>
          <div className="resource-grid">
            {[
              "AI narrative and incident copilot",
              "Threat score and bot intelligence",
              "Alert center and audit trail",
              "Scenario lab and incident reports",
              "SLA, service health, and capacity analysis",
              "Natural-language query console",
            ].map((item) => (
              <article key={item} className="resource-card resource-card--info">
                <p>{item}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
