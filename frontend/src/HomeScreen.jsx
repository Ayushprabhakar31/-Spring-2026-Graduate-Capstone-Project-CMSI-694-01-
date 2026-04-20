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
    ],
    [auditRows.length, homeData?.stats, viewMode],
  );

  const featureDeck = useMemo(
    () => homeData?.modules || [
      {
        id: "security",
        eyebrow: "AI Analyst",
        title: "Explain threats, not just metrics",
        copy: "Turn attack patterns and anomalies into clear reasoning, likely root cause, and response guidance.",
        cta: "Open Security Analyst",
        tone: "info",
      },
      {
        id: "chat",
        eyebrow: "Conversational UX",
        title: "Ask the platform what matters right now",
        copy: "Make the experience feel alive with a natural-language workspace for incidents, risk, and business impact.",
        cta: "Open Chat Workspace",
        tone: "success",
      },
      {
        id: "analytics",
        eyebrow: "Executive Readout",
        title: "Move from live ops into decision-grade insight",
        copy: "Give judges and stakeholders a cleaner path from telemetry to trends, outcomes, and strategic value.",
        cta: "Open Analytics Hub",
        tone: "warning",
      },
    ],
    [homeData?.modules],
  );

  const launchpad = useMemo(
    () => homeData?.launchpad || [
      { id: "war-room", label: "War Room", text: "Coordinate response, next steps, and briefings.", accent: "danger" },
      { id: "studio", label: "Prompt Studio", text: "Design reusable AI prompts for the demo and operations.", accent: "violet" },
      { id: "sites", label: "Website Monitor", text: "Show live data capture and monitoring credibility.", accent: "info" },
      { id: "coach", label: "Presentation Coach", text: "Tighten your story, Q&A, and final demo flow.", accent: "success" },
      { id: "atlas", label: "Threat Atlas", text: "Bring a sharper visual signature to your security story.", accent: "warning" },
      { id: "exports", label: "Export Center", text: "Package the narrative as polished artifacts and reports.", accent: "info" },
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

  return (
    <main className="home-shell">
      <section className="home-hero">
        <div className="home-hero__copy">
          <div className="home-badge">AI-native security operations</div>
          <p className="eyebrow">Latest Home Surface</p>
          <h2>{homeData?.hero?.title || "PulseOps feels like a product now, not a student dashboard."}</h2>
          <p className="home-hero__lede">
            {homeData?.hero?.detail || "This new home screen puts the best parts of your capstone front and center: real-time readiness, AI-guided actions, strong storytelling, and fast entry into the modules that make the project stand out."}
          </p>
          <div className="home-hero__actions">
            <button className="home-primary-action" onClick={() => onNavigate("security")} type="button">
              Open AI Analyst
            </button>
            <button className="home-secondary-action" onClick={onOpenPalette} type="button">
              Explore Workspace
            </button>
            <button className="home-secondary-action" onClick={onToggleViewMode} type="button">
              Switch to {viewMode === "operator" ? "Presentation" : "Operator"} Mode
            </button>
          </div>
          <div className="home-hero__meta">
            <div>
              <span>Operator</span>
              <strong>{session?.name || "PulseOps User"}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>{session?.role || "Platform Operator"}</strong>
            </div>
            <div>
              <span>Today</span>
              <strong>{todayLabel}</strong>
            </div>
            <div>
              <span>Stream</span>
              <strong>{streamState === "live" ? "Connected" : streamState === "reconnecting" ? "Reconnecting" : "Offline"}</strong>
            </div>
          </div>
        </div>

        <div className="home-hero__stack">
          <article className="home-glass-card home-glass-card--primary">
            <span className="home-glass-card__label">Next Best Move</span>
            <strong>{homeData?.hero?.nextBestMove || "Lead with the AI analyst, then pivot into analytics and exports."}</strong>
            <p>
              {homeData?.hero?.nextBestMoveDetail || "That flow gives you the strongest sequence for demo day: live system understanding, business framing, and polished artifacts."}
            </p>
            <button className="home-inline-link" onClick={() => onNavigate("analytics")} type="button">
              Open analytics storyline
            </button>
          </article>
          <article className="home-glass-card">
            <span className="home-glass-card__label">Workspace Pulse</span>
            <strong>{auditRows.length ? `${auditRows.length} recent platform events` : "Ready to stream live activity"}</strong>
            <p>
              Use the activity drawer to reinforce that the platform is active, monitored, and presentation-ready in real time.
            </p>
            <button className="home-inline-link" onClick={onOpenActivity} type="button">
              View live activity
            </button>
          </article>
        </div>
      </section>

      <section className="home-stat-grid">
        {heroStats.map((stat) => (
          <article key={stat.label} className="home-stat-card">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <p>{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="home-layout-grid">
        <div className="home-feature-column">
          <div className="home-section-heading">
            <p className="eyebrow">AI Differentiators</p>
            <h3>What makes this feel next-level</h3>
          </div>
          <div className="home-feature-grid">
            {featureDeck.map((item) => (
              <article key={item.id} className={`home-feature-card home-feature-card--${item.tone}`}>
                <span>{item.eyebrow}</span>
                <strong>{item.title}</strong>
                <p>{item.copy}</p>
                <button className="home-inline-link" onClick={() => onNavigate(item.id)} type="button">
                  {item.cta}
                </button>
              </article>
            ))}
          </div>
        </div>

        <aside className="home-side-column">
          <div className="home-section-heading">
            <p className="eyebrow">Live Feed</p>
            <h3>What the system is doing</h3>
          </div>
          <div className="home-feed-list">
            {liveFeed.map((item) => (
              <article key={item.id} className="home-feed-card">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <span>{item.meta}</span>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="home-launchpad">
        <div className="home-section-heading">
          <p className="eyebrow">Launchpad</p>
          <h3>Jump into the strongest parts of the platform</h3>
        </div>
        <div className="home-launchpad-grid">
          {launchpad.map((item) => (
            <button key={item.id} className={`home-launch-card home-launch-card--${item.accent}`} onClick={() => onNavigate(item.id)} type="button">
              <strong>{item.label}</strong>
              <p>{item.text}</p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
