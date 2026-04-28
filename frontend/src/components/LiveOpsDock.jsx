import { useMemo, useState } from "react";
import useSnapshot from "../hooks/useSnapshot";

function CompactMetric({ label, value, detail, tone = "info" }) {
  return (
    <article className={`live-ops-metric live-ops-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default function LiveOpsDock({ pageLabel, onNavigate, viewMode }) {
  const { snapshot, loading, streamStatus } = useSnapshot();
  const [expanded, setExpanded] = useState(true);

  const topAlert = snapshot?.alertCenter?.[0] || null;
  const topEndpoint = snapshot?.topEndpoint?.name || "No hotspot yet";
  const rootCause = snapshot?.rootCauses?.[0];
  const timeline = useMemo(() => (snapshot?.timeline || []).slice(0, 3), [snapshot?.timeline]);
  const securityWarnings = useMemo(() => (snapshot?.securityWarnings || []).slice(0, 2), [snapshot?.securityWarnings]);

  const recommendation = useMemo(() => {
    if (snapshot?.threatScore >= 45) {
      return {
        title: "Escalate into Security Analyst",
        detail: "Threat pressure is elevated enough to justify triage, containment guidance, and response explanation.",
        target: "security",
        cta: "Open analyst",
      };
    }

    if ((snapshot?.totals?.avgLatency || 0) >= 350) {
      return {
        title: "Move to Analytics Hub",
        detail: "Latency is climbing. Compare current and previous windows to explain what changed and why.",
        target: "analytics",
        cta: "Open analytics",
      };
    }

    return {
      title: "Stay in command and brief the team",
      detail: "The platform looks stable enough for a strong overview. Use War Room if you want a more operational handoff.",
      target: "war-room",
      cta: "Open war room",
    };
  }, [snapshot?.threatScore, snapshot?.totals?.avgLatency]);

  return (
    <section className={`live-ops-dock ${expanded ? "is-expanded" : "is-collapsed"}`}>
      <div className="live-ops-dock__header">
        <div>
          <p className="eyebrow">Live Ops Layer</p>
          <h2>Real-time mission context</h2>
        </div>
        <div className="live-ops-dock__controls">
          <div className={`live-ops-dock__stream live-ops-dock__stream--${streamStatus}`}>
            <span className="live-ops-dock__stream-dot" />
            {streamStatus === "live" ? "SSE live" : streamStatus === "polling" ? "Polling fallback" : streamStatus}
          </div>
          <button className="topbar__nav-button" onClick={() => setExpanded((current) => !current)} type="button">
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="live-ops-dock__grid">
          <div className="live-ops-dock__column">
            <div className="live-ops-hero">
              <div className="live-ops-hero__meta">
                <span className="live-ops-hero__badge">{loading ? "Loading live state" : snapshot?.scenarioLabel || "Normal Ops"}</span>
                <span className="live-ops-hero__badge live-ops-hero__badge--soft">{viewMode === "operator" ? "Operator mode" : "Presentation mode"}</span>
                <span className="live-ops-hero__badge live-ops-hero__badge--soft">Current page: {pageLabel}</span>
              </div>
              <h3>{recommendation.title}</h3>
              <p>{recommendation.detail}</p>
              <div className="live-ops-hero__actions">
                <button className="home-primary-action" onClick={() => onNavigate(recommendation.target)} type="button">
                  {recommendation.cta}
                </button>
                <button className="home-secondary-action" onClick={() => onNavigate("command")} type="button">
                  Return to command
                </button>
              </div>
            </div>

            <div className="live-ops-metric-grid">
              <CompactMetric
                label="Health"
                value={`${snapshot?.totals?.healthScore ?? 100}/100`}
                detail="Platform-wide operating score"
                tone="success"
              />
              <CompactMetric
                label="Threat"
                value={`${snapshot?.threatScore ?? 0}/100`}
                detail={topAlert?.title || "Current threat pressure"}
                tone={snapshot?.threatScore >= 45 ? "danger" : "warning"}
              />
              <CompactMetric
                label="Hot path"
                value={topEndpoint}
                detail={`${snapshot?.topEndpoint?.count || 0} observed requests in the rolling window`}
                tone="info"
              />
              <CompactMetric
                label="RPS"
                value={snapshot?.totals?.currentRps ?? 0}
                detail={`${snapshot?.totals?.avgLatency ?? 0}ms average latency`}
                tone="violet"
              />
            </div>
          </div>

          <div className="live-ops-dock__column">
            <article className="live-ops-panel">
              <div className="live-ops-panel__header">
                <div>
                  <p className="eyebrow">AI Readout</p>
                  <h3>Most likely root cause</h3>
                </div>
              </div>
              <p className="live-ops-panel__lead">{rootCause?.title || "Telemetry is still building enough evidence for a stronger root-cause readout."}</p>
              <div className="live-ops-panel__notes">
                <div className="copilot-bullet">
                  <span className="insight-action__dot" />
                  <span>{rootCause?.evidence || "Use the Security Analyst and Analytics Hub together for the clearest story."}</span>
                </div>
                <div className="copilot-bullet">
                  <span className="insight-action__dot" />
                  <span>{snapshot?.roleBriefings?.sre || "SRE guidance will appear here once live telemetry strengthens the narrative."}</span>
                </div>
              </div>
            </article>

            <article className="live-ops-panel">
              <div className="live-ops-panel__header">
                <div>
                  <p className="eyebrow">Watchlist</p>
                  <h3>Signals worth talking about</h3>
                </div>
              </div>
              <div className="live-ops-watchlist">
                {(securityWarnings.length ? securityWarnings : [{ id: "stable", title: "No major warnings", detail: "The system is currently in a stable monitoring posture." }]).map((item) => (
                  <div key={item.id} className="live-ops-watchlist__item">
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                ))}
                {timeline.map((item) => (
                  <div key={item.id} className="live-ops-watchlist__item live-ops-watchlist__item--timeline">
                    <strong>{item.label}</strong>
                    <p>{new Date(item.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}
