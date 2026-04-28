import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

function formatTime(ts) {
  if (!ts) return "Live now";

  try {
    return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch (error) {
    return "Live now";
  }
}

export default function HomeScreen({
  session,
  auditRows,
  notifications,
  onNavigate,
  onOpenPalette,
  onOpenActivity,
  onToggleViewMode,
  viewMode,
}) {
  const [homeData, setHomeData] = useState(null);
  const [streamState, setStreamState] = useState("connecting");

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    let mounted = true;
    let eventSource = null;

    async function loadSummary() {
      try {
        const response = await fetch(`${API_BASE}/api/home/summary`);
        if (!response.ok) return;
        const data = await response.json();
        if (mounted) {
          setHomeData(data);
          setStreamState("live");
        }
      } catch (error) {
        if (mounted) setStreamState("offline");
      }
    }

    loadSummary();

    try {
      eventSource = new EventSource(`${API_BASE}/api/home/realtime`);
      eventSource.addEventListener("connected", () => {
        if (mounted) setStreamState("live");
      });
      eventSource.addEventListener("home", (event) => {
        if (!mounted) return;
        setHomeData(JSON.parse(event.data));
        setStreamState("live");
      });
      eventSource.onerror = () => {
        if (mounted) setStreamState("reconnecting");
      };
    } catch (error) {
      setStreamState("offline");
    }

    return () => {
      mounted = false;
      eventSource?.close();
    };
  }, []);

  const heroStats = useMemo(
    () => homeData?.stats || [
      { label: "Active Modules", value: "14", detail: "AI, security, analytics, exports, and demo tools" },
      { label: "Live Signals", value: String(auditRows.length).padStart(2, "0"), detail: "Recent audit and platform activity" },
      { label: "Mode", value: viewMode === "operator" ? "Ops" : "Pitch", detail: "Instant switch between operator and presentation views" },
      { label: "Stream", value: streamState === "live" ? "Live" : "Offline", detail: "Real-time homepage updates" },
    ],
    [auditRows.length, homeData?.stats, streamState, viewMode],
  );

  const featureDeck = useMemo(
    () => homeData?.modules || [
      {
        id: "security",
        eyebrow: "AI Analyst",
        title: "Explain threats, not just metrics",
        copy: "Turn attack patterns and anomalies into clear reasoning, likely root cause, and response guidance.",
        cta: "Open Security Analyst",
      },
      {
        id: "chat",
        eyebrow: "Conversational UX",
        title: "Ask the platform what matters right now",
        copy: "Make the experience feel alive with a natural-language workspace for incidents, risk, and business impact.",
        cta: "Open Chat Workspace",
      },
      {
        id: "analytics",
        eyebrow: "Executive Readout",
        title: "Move from live ops into decision-grade insight",
        copy: "Give judges and stakeholders a cleaner path from telemetry to trends, outcomes, and strategic value.",
        cta: "Open Analytics Hub",
      },
    ],
    [homeData?.modules],
  );

  const launchpad = useMemo(
    () => homeData?.launchpad || [
      { id: "war-room", label: "War Room", text: "Coordinate response, next steps, and briefings." },
      { id: "studio", label: "Prompt Studio", text: "Design reusable AI prompts for the demo and operations." },
      { id: "sites", label: "Website Monitor", text: "Show live data capture and monitoring credibility." },
      { id: "security", label: "Security Analyst", text: "Investigate attack posture and AI-guided response options." },
      { id: "analytics", label: "Analytics Hub", text: "Turn operational signals into trends, outcomes, and proof." },
      { id: "exports", label: "Export Center", text: "Package the narrative as polished artifacts and reports." },
    ],
    [homeData?.launchpad],
  );

  const liveFeed = useMemo(() => {
    if (homeData?.feed?.length) return homeData.feed;

    if (auditRows.length) {
      return auditRows.slice(0, 4).map((row) => ({
        id: row.id,
        title: row.action,
        detail: row.detail || "Platform event captured",
        meta: `${row.actor || "system"} · ${formatTime(row.ts)}`,
      }));
    }

    return notifications.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.body,
      meta: "PulseOps signal · just now",
    }));
  }, [auditRows, homeData?.feed, notifications]);

  const missionDeck = useMemo(
    () => [
      {
        id: "triage",
        label: "Autonomous Triage",
        title: "Ask the AI analyst to classify the highest-risk signal",
        detail: homeData?.status?.copilotPrompt || "Use the current telemetry snapshot to identify the highest-risk issue and suggest the next action.",
        action: () => onNavigate("security"),
        cta: "Run AI triage",
      },
      {
        id: "briefing",
        label: "Board Briefing",
        title: "Turn live telemetry into an executive narrative",
        detail: "Jump from live operations into analytics and executive framing without losing the thread of the incident.",
        action: () => onNavigate("executive"),
        cta: "Open executive suite",
      },
      {
        id: "prompt",
        label: "Prompt Runbook",
        title: "Generate reusable prompts for incident response",
        detail: "Build a repeatable prompt pack for demos, investigations, and operator workflows.",
        action: () => onNavigate("studio"),
        cta: "Open prompt studio",
      },
    ],
    [homeData?.status?.copilotPrompt, onNavigate],
  );

  const reasoningTrace = useMemo(
    () => [
      `Signal source: ${homeData?.status?.scenario || "Normal Ops"}`,
      `Current throughput: ${homeData?.status?.currentRps || 0} requests/sec`,
      `Average latency: ${homeData?.status?.avgLatency || 0} ms`,
      `${homeData?.status?.serviceWarnings || 0} service warnings currently surfaced`,
    ],
    [homeData?.status?.avgLatency, homeData?.status?.currentRps, homeData?.status?.scenario, homeData?.status?.serviceWarnings],
  );

  const promptStarters = useMemo(
    () => [
      "Summarize the current operational posture in plain English.",
      "What should the on-call engineer do in the next 15 minutes?",
      "Translate the current incident into executive impact language.",
      "Which module should I open first for the strongest live demo?",
    ],
    [],
  );

  const essentials = useMemo(
    () => homeData?.essentials || {
      monitoredSiteCount: 0,
      alertCount: 0,
      incidentCount: 0,
      topServices: [],
      topSites: [],
    },
    [homeData?.essentials],
  );

  return (
    <main className="home-shell">
      <section className="home-stage">
        <div className="home-stage__intro">
          <div className="home-kicker-row">
            <div className="home-badge">AI-native operations</div>
            <div className={`home-live-pill home-live-pill--${streamState === "live" ? "live" : streamState === "reconnecting" ? "warm" : "cold"}`}>
              <span className="home-live-pill__dot" />
              {streamState === "live" ? "Live stream connected" : streamState === "reconnecting" ? "Reconnecting" : "Backend offline"}
            </div>
          </div>

          <p className="home-stage__eyebrow">Command Center Home</p>
          <h2>{homeData?.hero?.title || "PulseOps turns telemetry into action and narrative."}</h2>
          <p className="home-stage__lede">
            {homeData?.hero?.detail || "A polished control surface for live monitoring, AI guidance, and executive-ready storytelling."}
          </p>

          <div className="home-stage__actions">
            <button className="home-primary-action" onClick={() => onNavigate("security")} type="button">
              Launch AI Analyst
            </button>
            <button className="home-secondary-action" onClick={() => onNavigate("chat")} type="button">
              Open Chat Workspace
            </button>
            <button className="home-tertiary-action" onClick={onOpenPalette} type="button">
              Explore All Modules
            </button>
          </div>

          <div className="home-meta-row">
            <div className="home-meta-chip">
              <span>Operator</span>
              <strong>{session?.name || "PulseOps User"}</strong>
            </div>
            <div className="home-meta-chip">
              <span>Role</span>
              <strong>{session?.role || "Platform Operator"}</strong>
            </div>
            <div className="home-meta-chip">
              <span>Mode</span>
              <strong>{viewMode === "operator" ? "Operator" : "Presentation"}</strong>
            </div>
            <div className="home-meta-chip">
              <span>Today</span>
              <strong>{todayLabel}</strong>
            </div>
          </div>
        </div>

        <aside className="home-stage__rail">
          <article className="home-spotlight-card">
            <span className="home-card-label">Next Best Move</span>
            <strong>{homeData?.hero?.nextBestMove || "Lead with AI Analyst, then pivot into analytics and exports."}</strong>
            <p>{homeData?.hero?.nextBestMoveDetail || "Show live system understanding first, then translate it into business-facing insight."}</p>
            <button className="home-inline-link" onClick={() => onNavigate("analytics")} type="button">
              Open analytics storyline
            </button>
          </article>

          <article className="home-activity-card">
            <div className="home-card-topline">
              <span className="home-card-label">Workspace Pulse</span>
              <button className="home-inline-link home-inline-link--tight" onClick={onOpenActivity} type="button">
                View activity
              </button>
            </div>
            <div className="home-activity-list">
              {liveFeed.slice(0, 3).map((item) => (
                <div key={item.id} className="home-activity-item">
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <span>{item.meta}</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="home-stats-bar">
        {heroStats.map((stat) => (
          <article key={stat.label} className="home-stat-card">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <p>{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="home-content-grid">
        <article className="home-story-card">
          <div className="home-section-heading">
            <p className="eyebrow">Why it stands out</p>
            <h3>A more modern product story</h3>
          </div>
          <p className="home-story-card__lede">
            This home screen is designed to feel more like a premium AI product landing surface than a traditional ops dashboard: cleaner hierarchy, sharper contrast, lighter motion, and faster paths into the highest-value experiences.
          </p>
          <div className="home-feature-grid">
            {featureDeck.map((item) => (
              <article key={item.id} className="home-feature-card">
                <span>{item.eyebrow}</span>
                <strong>{item.title}</strong>
                <p>{item.copy}</p>
                <button className="home-inline-link" onClick={() => onNavigate(item.id)} type="button">
                  {item.cta}
                </button>
              </article>
            ))}
          </div>
        </article>

        <article className="home-control-card">
          <div className="home-section-heading">
            <p className="eyebrow">Control Surface</p>
            <h3>Fast transitions for demos</h3>
          </div>
          <div className="home-control-stack">
            <button className="home-control-button" onClick={onToggleViewMode} type="button">
              <span>View Mode</span>
              <strong>Switch to {viewMode === "operator" ? "Presentation" : "Operator"} Mode</strong>
            </button>
            <button className="home-control-button" onClick={() => onNavigate("war-room")} type="button">
              <span>Incident Flow</span>
              <strong>Open War Room</strong>
            </button>
            <button className="home-control-button" onClick={() => onNavigate("exports")} type="button">
              <span>Outputs</span>
              <strong>Prepare exports and reports</strong>
            </button>
          </div>
        </article>
      </section>

      <section className="home-ai-grid">
        <article className="home-ai-panel home-ai-panel--mission">
          <div className="home-section-heading">
            <p className="eyebrow">AI Mission Control</p>
            <h3>Let the product feel more autonomous</h3>
          </div>
          <div className="home-mission-list">
            {missionDeck.map((mission) => (
              <button key={mission.id} className="home-mission-card" onClick={mission.action} type="button">
                <span>{mission.label}</span>
                <strong>{mission.title}</strong>
                <p>{mission.detail}</p>
                <em>{mission.cta}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="home-ai-panel">
          <div className="home-section-heading">
            <p className="eyebrow">System Essentials</p>
            <h3>The information operators actually need</h3>
          </div>
          <div className="home-essential-grid">
            <div className="home-essential-card">
              <span className="home-card-label">Monitored Sites</span>
              <strong>{essentials.monitoredSiteCount}</strong>
              <p>Properties currently streaming or ready to stream telemetry.</p>
            </div>
            <div className="home-essential-card">
              <span className="home-card-label">Active Alerts</span>
              <strong>{essentials.alertCount}</strong>
              <p>Alert conditions currently surfaced in the system.</p>
            </div>
            <div className="home-essential-card">
              <span className="home-card-label">Incidents</span>
              <strong>{essentials.incidentCount}</strong>
              <p>Current incident signals crossing response thresholds.</p>
            </div>
          </div>
          <div className="home-trace-list">
            {reasoningTrace.map((item) => (
              <div key={item} className="home-trace-row">
                <span className="home-trace-dot" />
                <p>{item}</p>
              </div>
            ))}
          </div>
          <div className="home-ai-status">
            <span className="home-card-label">Model Guidance</span>
            <strong>{homeData?.status?.copilotPrompt || "Ask the AI analyst for the strongest signal and recommended next steps."}</strong>
          </div>
        </article>
      </section>

      <section className="home-operations-grid">
        <article className="home-ops-panel">
          <div className="home-section-heading">
            <p className="eyebrow">Service Health</p>
            <h3>Core system status</h3>
          </div>
          <div className="home-service-list">
            {essentials.topServices.length ? essentials.topServices.map((service) => (
              <div key={service.name} className="home-service-row">
                <div>
                  <strong>{service.name}</strong>
                  <p>{service.detail}</p>
                </div>
                <span className={`home-service-badge home-service-badge--${service.status}`}>{service.status}</span>
              </div>
            )) : (
              <div className="home-service-row">
                <div>
                  <strong>No service health data yet</strong>
                  <p>Service summaries will appear as telemetry becomes available.</p>
                </div>
              </div>
            )}
          </div>
        </article>

        <article className="home-ops-panel">
          <div className="home-section-heading">
            <p className="eyebrow">Top Sites</p>
            <h3>Most important monitored properties</h3>
          </div>
          <div className="home-service-list">
            {essentials.topSites.length ? essentials.topSites.map((site) => (
              <div key={site.id} className="home-service-row">
                <div>
                  <strong>{site.name}</strong>
                  <p>{site.domain} · {site.requests} requests · risk {site.riskScore}</p>
                </div>
                <span className={`home-service-badge home-service-badge--${site.status}`}>{site.status}</span>
              </div>
            )) : (
              <div className="home-service-row">
                <div>
                  <strong>No monitored sites yet</strong>
                  <p>Register sites in Website Monitor to start collecting live telemetry.</p>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="home-prompt-strip">
        <div className="home-section-heading">
          <p className="eyebrow">Prompt Starters</p>
          <h3>Make the experience feel more generative</h3>
        </div>
        <div className="home-prompt-list">
          {promptStarters.map((prompt) => (
            <button key={prompt} className="home-prompt-chip" onClick={() => onNavigate("chat")} type="button">
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="home-launchpad">
        <div className="home-section-heading">
          <p className="eyebrow">Launchpad</p>
          <h3>Jump into the strongest modules</h3>
        </div>
        <div className="home-launchpad-grid">
          {launchpad.map((item) => (
            <button key={item.id} className="home-launch-card" onClick={() => onNavigate(item.id)} type="button">
              <strong>{item.label}</strong>
              <p>{item.text}</p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
