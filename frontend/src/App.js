import { useEffect, useMemo, useState } from "react";
import "./App.css";
import Dashboard from "./Dashboard";
import ExecutiveSuite from "./ExecutiveSuite";
import PromptStudio from "./PromptStudio";
import SystemBlueprint from "./SystemBlueprint";
import WarRoom from "./WarRoom";
import AuthPortal from "./AuthPortal";
import BackgroundScene from "./BackgroundScene";
import PresentationCoach from "./PresentationCoach";
import ExportCenter from "./ExportCenter";
import ChatWorkspace from "./ChatWorkspace";
import ThreatAtlas from "./ThreatAtlas";
import SiteWatch from "./SiteWatch";
import SecurityAnalyst from "./SecurityAnalyst";
import AnalyticsHub from "./AnalyticsHub";
import AdminConsole from "./AdminConsole";
import AttackLab from "./AttackLab";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";
const PAGES = [
  { id: "command", label: "Command Center" },
  { id: "war-room", label: "War Room" },
  { id: "studio", label: "AI Prompt Studio" },
  { id: "chat", label: "Chat Workspace" },
  { id: "sites", label: "Website Monitor" },
  { id: "security", label: "AI Security Analyst" },
  { id: "attacks", label: "Attack Lab" },
  { id: "analytics", label: "Analytics Hub" },
  { id: "executive", label: "Executive Suite" },
  { id: "exports", label: "Export Center" },
  { id: "coach", label: "Presentation Coach" },
  { id: "atlas", label: "Threat Atlas" },
  { id: "blueprint", label: "System Blueprint" },
  { id: "admin", label: "Admin Console" },
];

const SESSION_KEY = "pulseops_session";
const ONBOARDING_KEY = "pulseops_onboarding_seen";
const VIEW_MODE_KEY = "pulseops_view_mode";

function readStoredSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function persistSession(session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

function readOnboardingSeen() {
  if (typeof window === "undefined") return true;
  if (process.env.NODE_ENV === "test") return true;

  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch (error) {
    return true;
  }
}

function markOnboardingSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, "true");
}

function App() {
  const [page, setPage] = useState("command");
  const [session, setSession] = useState(() => readStoredSession());
  const [viewMode, setViewMode] = useState(() => (typeof window !== "undefined" ? window.localStorage.getItem(VIEW_MODE_KEY) || "operator" : "operator"));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !readOnboardingSeen());
  const [paletteQuery, setPaletteQuery] = useState("");
  const [auditRows, setAuditRows] = useState([]);

  function handleAuthenticate(nextSession) {
    persistSession(nextSession);
    setSession(nextSession);
    const rolePageMap = {
      "Security Analyst": "security",
      "Executive Viewer": "executive",
      "Incident Commander": "war-room",
      "Platform Operator": "command",
    };
    setPage(rolePageMap[nextSession.role] || "command");
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setPage("command");
  }

  const quickActions = useMemo(
    () => [
      { id: "command", label: "Open Command Center", description: "Live telemetry, AI signals, and threat posture", onSelect: () => setPage("command") },
      { id: "war-room", label: "Open War Room", description: "Operational workflow and incident exports", onSelect: () => setPage("war-room") },
      { id: "studio", label: "Open Prompt Studio", description: "Natural-language AI prompt generation", onSelect: () => setPage("studio") },
      { id: "chat", label: "Open Chat Workspace", description: "Conversational AI workspace for live system questions", onSelect: () => setPage("chat") },
      { id: "sites", label: "Open Website Monitor", description: "Register websites, copy the collector snippet, and watch traffic + threat warnings", onSelect: () => setPage("sites") },
      { id: "security", label: "Open AI Security Analyst", description: "Dedicated AI workspace for attacks, playbooks, and weekly security summaries", onSelect: () => setPage("security") },
      { id: "attacks", label: "Open Attack Lab", description: "Run credential stuffing, admin probe, scraping, and API abuse presets", onSelect: () => setPage("attacks") },
      { id: "analytics", label: "Open Analytics Hub", description: "Historical trends, anomaly scores, and incident comparisons", onSelect: () => setPage("analytics") },
      { id: "executive", label: "Open Executive Suite", description: "Business summary and board-style reporting", onSelect: () => setPage("executive") },
      { id: "exports", label: "Open Export Center", description: "Download reports, briefing packs, and telemetry assets", onSelect: () => setPage("exports") },
      { id: "coach", label: "Open Presentation Coach", description: "Pitch prep, demo flow, and likely Q&A", onSelect: () => setPage("coach") },
      { id: "atlas", label: "Open Threat Atlas", description: "Richer regional threat map and mitigation surface", onSelect: () => setPage("atlas") },
      { id: "blueprint", label: "Open System Blueprint", description: "Architecture view for technical explanation", onSelect: () => setPage("blueprint") },
      { id: "admin", label: "Open Admin Console", description: "Users, API keys, webhooks, shared reports, and log ingestion", onSelect: () => setPage("admin") },
    ],
    [],
  );

  const filteredQuickActions = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    if (!query) return quickActions;
    return quickActions.filter((action) =>
      `${action.label} ${action.description}`.toLowerCase().includes(query),
    );
  }, [paletteQuery, quickActions]);

  const notifications = useMemo(
    () => [
      { id: "notif-1", tone: "info", title: "Presentation coach ready", body: "Use the coach page to rehearse your 90-second pitch and likely Q&A." },
      { id: "notif-2", tone: "success", title: "AI workspace active", body: "Prompt Studio, War Room, and the copilot can all be used together during the demo." },
      { id: "notif-3", tone: "warning", title: "Current focus", body: `You are viewing ${PAGES.find((item) => item.id === page)?.label || "the suite"}.` },
      { id: "notif-4", tone: "info", title: "Quick actions updated", body: "Use Cmd/Ctrl + K to jump across the workspace faster." },
    ],
    [page],
  );

  const activityFeed = useMemo(() => {
    const auditItems = auditRows.map((row) => ({
      id: row.id,
      tone: "info",
      label: row.actor || "system",
      title: row.action,
      detail: row.detail,
      ts: new Date(row.ts).toLocaleTimeString(),
    }));

    return [
      { id: "feed-shell", tone: "success", label: "Workspace", title: "Presentation-ready mode active", detail: "The platform shell, exports, and coach page are ready for class.", ts: "now" },
      { id: "feed-page", tone: "info", label: "Navigation", title: `Current page: ${PAGES.find((item) => item.id === page)?.label || "Workspace"}`, detail: "Use the sidebar for primary navigation and the drawer for recent activity.", ts: "live" },
      ...auditItems,
    ];
  }, [auditRows, page]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setNotificationsOpen(false);
        setPaletteQuery("");
        if (showOnboarding) {
          markOnboardingSeen();
          setShowOnboarding(false);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showOnboarding]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    let intervalId = null;

    async function loadAudit() {
      try {
        const response = await fetch(`${API_BASE}/api/audit`);
        if (!response.ok) return;
        const data = await response.json();
        setAuditRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (error) {
        // Keep the drawer resilient in offline or local-only states.
      }
    }

    loadAudit();

    if (notificationsOpen) {
      intervalId = window.setInterval(loadAudit, 3000);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [notificationsOpen]);

  if (!session) {
    return (
      <div className="app-shell">
        <BackgroundScene />
        <AuthPortal onAuthenticate={handleAuthenticate} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <BackgroundScene />
      <div className="workspace-shell">
        <aside className="sidebar">
          <div className="sidebar__brand">
            <div className="topbar__mark" aria-hidden="true">
              <span />
              <span />
            </div>
            <div>
              <p className="topbar__eyebrow">Capstone Platform</p>
              <h1>PulseOps</h1>
              <p className="topbar__subcopy">AI-native operations suite</p>
            </div>
          </div>
          <div className="sidebar__section">
            <div className="sidebar__label">Workspace</div>
            <nav className="sidebar__nav">
              {PAGES.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar__nav-button ${page === item.id ? "is-active" : ""}`}
                  onClick={() => setPage(item.id)}
                  type="button"
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="sidebar__section">
            <div className="sidebar__label">Shortcuts</div>
            <div className="sidebar__stack">
              <button className="topbar__quick-open" onClick={() => setPaletteOpen(true)} type="button">Quick Actions</button>
              <button className="topbar__quick-open" onClick={() => setNotificationsOpen(true)} type="button">Notifications</button>
              <button className="topbar__quick-open" onClick={() => setViewMode((current) => current === "operator" ? "presentation" : "operator")} type="button">
                {viewMode === "operator" ? "Presentation Mode" : "Operator Mode"}
              </button>
            </div>
          </div>
          <div className="sidebar__footer">
            <div className="topbar__status">
              <span className="topbar__status-dot" />
              <span>Presentation-ready workspace</span>
            </div>
            <div className="topbar__user">
              <div className="topbar__avatar" aria-hidden="true">
                {session.name?.slice(0, 1)?.toUpperCase() || "P"}
              </div>
              <div className="topbar__user-copy">
                <strong>{session.name || "PulseOps User"}</strong>
                <span>{session.role || "Platform Operator"}</span>
              </div>
            </div>
            <button className="topbar__logout" onClick={handleLogout} type="button">Logout</button>
          </div>
        </aside>

        <div className="workspace-main">
          <header className="topbar topbar--workspace">
            <div className="topbar__brand">
              <div>
                <p className="topbar__eyebrow">Current Workspace</p>
                <h1>{PAGES.find((item) => item.id === page)?.label || "PulseOps Platform Suite"}</h1>
                <p className="topbar__subcopy">Move through command, response, exports, and presentation views from one suite.</p>
              </div>
            </div>
            <div className="topbar__controls">
              <div className="topbar__account-row">
                <div className="topbar__status">
                  <span className="topbar__status-dot" />
                  <span>{viewMode === "operator" ? "Operator mode" : "Presentation mode"}</span>
                </div>
                <button className="topbar__quick-open" onClick={() => setPaletteOpen(true)} type="button">Quick Actions</button>
                <button className="topbar__quick-open" onClick={() => setNotificationsOpen(true)} type="button">Activity</button>
              </div>
            </div>
          </header>

          {page === "command" ? <Dashboard /> : null}
          {page === "war-room" ? <WarRoom /> : null}
          {page === "studio" ? <PromptStudio /> : null}
          {page === "chat" ? <ChatWorkspace /> : null}
          {page === "sites" ? <SiteWatch /> : null}
          {page === "security" ? <SecurityAnalyst /> : null}
          {page === "attacks" ? <AttackLab /> : null}
          {page === "analytics" ? <AnalyticsHub /> : null}
          {page === "executive" ? <ExecutiveSuite /> : null}
          {page === "exports" ? <ExportCenter /> : null}
          {page === "coach" ? <PresentationCoach /> : null}
          {page === "atlas" ? <ThreatAtlas /> : null}
          {page === "blueprint" ? <SystemBlueprint /> : null}
          {page === "admin" ? <AdminConsole /> : null}
        </div>
      </div>

      {paletteOpen ? (
        <div className="command-palette" role="dialog" aria-modal="true">
          <button className="command-palette__backdrop" onClick={() => setPaletteOpen(false)} type="button" aria-label="Close quick actions" />
          <div className="command-palette__panel">
            <div className="command-palette__header">
              <div>
                <p className="eyebrow">Quick Actions</p>
                <h2>Jump to a workspace</h2>
              </div>
              <button className="topbar__logout" onClick={() => setPaletteOpen(false)} type="button">
                Close
              </button>
            </div>
            <div className="command-palette__search">
              <input
                className="copilot-input query-input"
                placeholder="Search pages, exports, or presentation tools"
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
              />
            </div>
            <div className="command-palette__list">
              {filteredQuickActions.map((action) => (
                <button
                  key={action.id}
                  className="command-palette__item"
                  onClick={() => {
                    action.onSelect();
                    setPaletteOpen(false);
                    setPaletteQuery("");
                  }}
                  type="button"
                >
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </button>
              ))}
              {!filteredQuickActions.length ? (
                <div className="command-palette__empty">
                  <strong>No matching actions</strong>
                  <span>Try searching for command, export, coach, or executive.</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {notificationsOpen ? (
        <div className="activity-drawer" role="dialog" aria-modal="true">
          <button className="activity-drawer__backdrop" onClick={() => setNotificationsOpen(false)} type="button" aria-label="Close activity drawer" />
          <aside className="activity-drawer__panel">
            <div className="command-palette__header">
              <div>
                <p className="eyebrow">Activity Drawer</p>
                <h2>Live workspace activity</h2>
              </div>
              <button className="topbar__logout" onClick={() => setNotificationsOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className="activity-drawer__section">
              <div className="sidebar__label">Notifications</div>
              <div className="command-palette__list">
                {notifications.map((item) => (
                  <div key={item.id} className={`command-palette__item command-palette__item--${item.tone}`}>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="activity-drawer__section">
              <div className="sidebar__label">Recent Activity</div>
              <div className="activity-feed">
                {activityFeed.map((item) => (
                  <div key={item.id} className={`activity-feed__item activity-feed__item--${item.tone}`}>
                    <span className="activity-feed__tag">{item.label}</span>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <span className="activity-feed__time">{item.ts}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="activity-drawer__section">
              <div className="sidebar__label">Keyboard Shortcuts</div>
              <div className="resource-grid">
                <div className="resource-card resource-card--info">
                  <div className="resource-card__tag">Cmd/Ctrl + K</div>
                  <p>Open quick actions and jump to another workspace instantly.</p>
                </div>
                <div className="resource-card resource-card--success">
                  <div className="resource-card__tag">Esc</div>
                  <p>Close overlays like quick actions, onboarding, or this activity drawer.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {showOnboarding ? (
        <div className="command-palette" role="dialog" aria-modal="true">
          <button
            className="command-palette__backdrop"
            onClick={() => {
              markOnboardingSeen();
              setShowOnboarding(false);
            }}
            type="button"
            aria-label="Close onboarding"
          />
          <div className="command-palette__panel">
            <div className="command-palette__header">
              <div>
                <p className="eyebrow">Welcome Flow</p>
                <h2>How to show PulseOps well</h2>
              </div>
            </div>
            <div className="resource-grid">
              <article className="resource-card resource-card--info">
                <div className="resource-card__tag">1. Command</div>
                <p>Start in the Command Center to show live telemetry, AI reasoning, and threat signals.</p>
              </article>
              <article className="resource-card resource-card--warning">
                <div className="resource-card__tag">2. Respond</div>
                <p>Use War Room to show workflow, exports, prompt launchers, and response assets.</p>
              </article>
              <article className="resource-card resource-card--success">
                <div className="resource-card__tag">3. Explain</div>
                <p>Finish with Presentation Coach, Executive Suite, or System Blueprint depending on the question.</p>
              </article>
            </div>
            <div className="quick-actions">
              <button
                className="copilot-submit"
                onClick={() => {
                  markOnboardingSeen();
                  setShowOnboarding(false);
                }}
                type="button"
              >
                Enter Workspace
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
