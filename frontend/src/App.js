import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import "./App.css";
import ErrorBoundary from "./components/ErrorBoundary";
import LiveOpsDock from "./components/LiveOpsDock";

// Eagerly loaded (needed immediately)
import AuthPortal from "./AuthPortal";
import BackgroundScene from "./BackgroundScene";

// Lazy loaded pages (code splitting)
const HomeScreen = lazy(() => import("./HomeScreen"));
const ExecutiveSuite = lazy(() => import("./ExecutiveSuite"));
const PromptStudio = lazy(() => import("./PromptStudio"));
const WarRoom = lazy(() => import("./WarRoom"));
const ExportCenter = lazy(() => import("./ExportCenter"));
const ChatWorkspace = lazy(() => import("./ChatWorkspace"));
const SecurityAnalyst = lazy(() => import("./SecurityAnalyst"));
const AnalyticsHub = lazy(() => import("./AnalyticsHub"));
const AdminConsole = lazy(() => import("./AdminConsole"));
const SiteWatch = lazy(() => import("./SiteWatch"));

const PAGES = [
  { id: "command", label: "Command Center", description: "AI-first overview, triage, and live operational posture." },
  { id: "security", label: "Security Analyst", description: "Threat diagnosis, AI guidance, and response recommendations." },
  { id: "analytics", label: "Analytics Hub", description: "Historical trends, anomalies, and performance insight." },
  { id: "sites", label: "Website Monitor", description: "Monitored properties, telemetry ingestion, and site health." },
  { id: "war-room", label: "War Room", description: "Coordinate incidents, responses, and operational handoffs." },
  { id: "chat", label: "Chat Workspace", description: "Conversational AI workspace for live operational questions." },
  { id: "studio", label: "Prompt Studio", description: "Reusable prompts and AI workflow templates." },
  { id: "executive", label: "Executive Suite", description: "Translate technical signals into business-facing summaries." },
  { id: "exports", label: "Export Center", description: "Reports, briefing packs, and shareable outputs." },
  { id: "admin", label: "Admin Console", description: "Users, keys, integrations, and workspace administration." },
];

const SESSION_KEY = "pulseops_session";
const ONBOARDING_KEY = "pulseops_onboarding_seen";
const VIEW_MODE_KEY = "pulseops_view_mode";

function isValidPage(pageId) {
  return PAGES.some((page) => page.id === pageId);
}

function readPageFromLocation() {
  const hashPage = window.location.hash.replace(/^#/, "").trim();
  return isValidPage(hashPage) ? hashPage : "command";
}

function readStoredSession() {
  try { return JSON.parse(window.localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function persistSession(s) { window.localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearSession() { window.localStorage.removeItem(SESSION_KEY); }
function readOnboardingSeen() {
  if (process.env.NODE_ENV === "test") return true;
  return window.localStorage.getItem(ONBOARDING_KEY) === "true";
}
function markOnboardingSeen() { window.localStorage.setItem(ONBOARDING_KEY, "true"); }

function PageLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", opacity: 0.5 }}>
      <p style={{ color: "var(--text-2, #aaa)", fontFamily: "Space Grotesk, sans-serif" }}>Loading...</p>
    </div>
  );
}

function App() {
  const [page, setPage] = useState(() => readPageFromLocation());
  const [session, setSession] = useState(() => readStoredSession());
  const [viewMode, setViewMode] = useState(() => window.localStorage.getItem(VIEW_MODE_KEY) || "operator");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !readOnboardingSeen());
  const [paletteQuery, setPaletteQuery] = useState("");
  const [auditRows] = useState([]);
  const [navTrail, setNavTrail] = useState(() => [readPageFromLocation()]);

  const currentPage = useMemo(
    () => PAGES.find((item) => item.id === page) || PAGES[0],
    [page],
  );

  function navigateTo(nextPage, options = {}) {
    const { replace = false, fromHistory = false } = options;
    if (!isValidPage(nextPage)) return;

    setPage(nextPage);
    setNavTrail((current) => {
      if (fromHistory) {
        const existingIndex = current.lastIndexOf(nextPage);
        if (existingIndex >= 0) return current.slice(0, existingIndex + 1);
        if (current[current.length - 1] === nextPage) return current;
        return [...current, nextPage];
      }

      if (replace) {
        if (!current.length) return [nextPage];
        return [...current.slice(0, -1), nextPage];
      }

      if (current[current.length - 1] === nextPage) return current;
      return [...current, nextPage];
    });

    if (!fromHistory) {
      const url = `${window.location.pathname}${window.location.search}#${nextPage}`;
      const state = { page: nextPage };
      if (replace) {
        window.history.replaceState(state, "", url);
      } else {
        window.history.pushState(state, "", url);
      }
    }
  }

  function handleBackNavigation() {
    if (navTrail.length > 1) {
      window.history.back();
      return;
    }

    navigateTo("command", { replace: true });
  }

  function handleAuthenticate(nextSession) {
    persistSession(nextSession);
    setSession(nextSession);
    const rolePageMap = {
      "Security Analyst": "security",
      "Executive Viewer": "executive",
      "Incident Commander": "war-room",
      "Platform Operator": "command",
    };
    navigateTo(rolePageMap[nextSession.role] || "command", { replace: true });
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setPage("command");
    setNavTrail(["command"]);
    window.history.replaceState({ page: "command" }, "", `${window.location.pathname}${window.location.search}#command`);
  }

  const quickActions = useMemo(() => PAGES.map((p) => ({
    ...p,
    onSelect: () => navigateTo(p.id),
  })), []);

  const filteredQuickActions = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    if (!query) return quickActions;
    return quickActions.filter((a) => a.label.toLowerCase().includes(query));
  }, [paletteQuery, quickActions]);

  const notifications = useMemo(() => [
    { id: "notif-1", tone: "info", title: "AI workspace active", body: "Command Center, Security Analyst, and Chat Workspace are aligned for live triage." },
    { id: "notif-2", tone: "success", title: "System is organized around core workflows", body: "Monitoring, analysis, incident response, reporting, and admin are the primary product surfaces." },
    { id: "notif-3", tone: "warning", title: "Current focus", body: `You are viewing ${currentPage.label}.` },
    { id: "notif-4", tone: "info", title: "Quick actions updated", body: "Use Cmd/Ctrl + K to jump across the workspace faster." },
  ], [currentPage.label]);

  const activityFeed = useMemo(() => {
    const auditItems = auditRows.map((row) => ({
      id: row.id, tone: "info", label: row.actor || "system", title: row.action, detail: row.detail, ts: new Date(row.ts).toLocaleTimeString(),
    }));
    return [
      { id: "feed-shell", tone: "success", label: "Workspace", title: "Presentation-ready mode active", detail: "The platform shell, exports, and executive workflows are ready for class.", ts: "now" },
      { id: "feed-page", tone: "info", label: "Navigation", title: `Current page: ${currentPage.label}`, detail: "Use the sidebar or the back button to move through the workspace.", ts: "live" },
      ...auditItems,
    ];
  }, [auditRows, currentPage.label]);

  useEffect(() => {
    const initialPage = readPageFromLocation();
    setPage(initialPage);
    setNavTrail([initialPage]);
    window.history.replaceState({ page: initialPage }, "", `${window.location.pathname}${window.location.search}#${initialPage}`);
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((c) => !c);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setNotificationsOpen(false);
        setPaletteQuery("");
        if (showOnboarding) { markOnboardingSeen(); setShowOnboarding(false); }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showOnboarding]);

  useEffect(() => {
    function handlePopState(event) {
      const nextPage = event.state?.page || readPageFromLocation();
      if (!isValidPage(nextPage)) return;
      setPage(nextPage);
      setNavTrail((current) => {
        const existingIndex = current.lastIndexOf(nextPage);
        if (existingIndex >= 0) return current.slice(0, existingIndex + 1);
        if (current[current.length - 1] === nextPage) return current;
        return [...current, nextPage];
      });
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const canGoBack = navTrail.length > 1;

  if (!session) {
    return (
      <div className="app-shell">
        <BackgroundScene />
        <AuthPortal onAuthenticate={handleAuthenticate} />
      </div>
    );
  }

  return (
    <div className={`app-shell app-shell--${viewMode}`}>
      <BackgroundScene />
      <div className="workspace-shell">
        <aside className="sidebar">
          <div className="sidebar__brand">
            <div className="topbar__mark" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div>
              <p className="topbar__eyebrow">PulseOps Workspace</p>
              <h1>Mission Control</h1>
              <p className="topbar__subcopy">Navigate every module from one clean operational shell.</p>
            </div>
          </div>

          <div className="sidebar__section">
            <div className="sidebar__label">Core Workspaces</div>
            <div className="sidebar__nav">
              {PAGES.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar__nav-button ${item.id === page ? "is-active" : ""}`}
                  onClick={() => navigateTo(item.id)}
                  type="button"
                >
                  <strong>{item.label}</strong>
                  <div className="sidebar__nav-copy">{item.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar__footer">
            <div className="sidebar__label">Workspace Controls</div>
            <div className="sidebar__stack">
              <button className="topbar__quick-open" onClick={handleBackNavigation} type="button" disabled={!canGoBack}>
                {canGoBack ? "Go Back" : "At Home"}
              </button>
              <button className="topbar__logout" onClick={() => setPaletteOpen(true)} type="button">Quick Actions</button>
              <button className="topbar__logout" onClick={() => setNotificationsOpen(true)} type="button">Activity Drawer</button>
              <button className="topbar__logout" onClick={() => setViewMode((c) => (c === "operator" ? "presentation" : "operator"))} type="button">
                Switch to {viewMode === "operator" ? "Presentation" : "Operator"} Mode
              </button>
              <button className="topbar__logout" onClick={handleLogout} type="button">Sign Out</button>
            </div>
          </div>
        </aside>

        <div className="workspace-main">
          <header className="topbar topbar--workspace">
            <div className="topbar__brand">
              <button className="topbar__back" onClick={handleBackNavigation} type="button" disabled={!canGoBack}>
                Back
              </button>
              <div className="topbar__title-row">
                <p className="topbar__eyebrow">Current Workspace</p>
                <h1>{currentPage.label}</h1>
                <p className="topbar__subcopy">{currentPage.description}</p>
              </div>
            </div>

            <div className="topbar__controls">
              <div className="topbar__account-row">
                <div className="topbar__status">
                  <span className="topbar__status-dot" />
                  {viewMode === "operator" ? "Operator mode" : "Presentation mode"}
                </div>
                <div className="topbar__user">
                  <div className="topbar__avatar">{(session?.name || "P").slice(0, 1).toUpperCase()}</div>
                  <div className="topbar__user-copy">
                    <strong>{session?.name || "PulseOps User"}</strong>
                    <span>{session?.role || "Platform Operator"}</span>
                  </div>
                </div>
              </div>
              <div className="topbar__nav">
                <button className="topbar__nav-button" onClick={() => setPaletteOpen(true)} type="button">Quick Actions</button>
                <button className="topbar__nav-button" onClick={() => setNotificationsOpen(true)} type="button">Activity</button>
                <button className="topbar__nav-button" onClick={() => navigateTo("command")} type="button">Home</button>
              </div>
            </div>
          </header>

          <LiveOpsDock pageLabel={currentPage.label} onNavigate={navigateTo} viewMode={viewMode} />

          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              {page === "command" ? (
                <HomeScreen
                  session={session}
                  page={page}
                  onNavigate={navigateTo}
                  onLogout={handleLogout}
                  notifications={notifications}
                  onOpenPalette={() => setPaletteOpen(true)}
                  onOpenActivity={() => setNotificationsOpen(true)}
                  auditRows={auditRows}
                  onToggleViewMode={() => setViewMode((c) => (c === "operator" ? "presentation" : "operator"))}
                  viewMode={viewMode}
                />
              ) : null}
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              {page === "war-room" ? <WarRoom /> : null}
              {page === "studio" ? <PromptStudio /> : null}
              {page === "chat" ? <ChatWorkspace /> : null}
              {page === "sites" ? <SiteWatch /> : null}
              {page === "security" ? <SecurityAnalyst /> : null}
              {page === "analytics" ? <AnalyticsHub /> : null}
              {page === "executive" ? <ExecutiveSuite /> : null}
              {page === "exports" ? <ExportCenter /> : null}
              {page === "admin" ? <AdminConsole /> : null}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Command Palette */}
      {paletteOpen ? (
        <div className="command-palette" role="dialog" aria-modal="true">
          <button className="command-palette__backdrop" onClick={() => setPaletteOpen(false)} type="button" aria-label="Close quick actions" />
          <div className="command-palette__panel">
            <div className="command-palette__header">
              <div><p className="eyebrow">Quick Actions</p><h2>Jump to a workspace</h2></div>
              <button className="topbar__logout" onClick={() => setPaletteOpen(false)} type="button">Close</button>
            </div>
            <div className="command-palette__search">
              <input className="copilot-input query-input" placeholder="Search pages..." value={paletteQuery} onChange={(e) => setPaletteQuery(e.target.value)} />
            </div>
            <div className="command-palette__list">
              {filteredQuickActions.map((action) => (
                <button key={action.id} className="command-palette__item" onClick={() => { navigateTo(action.id); setPaletteOpen(false); setPaletteQuery(""); }} type="button">
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </button>
              ))}
              {!filteredQuickActions.length ? (
                <div className="command-palette__empty"><strong>No matching actions</strong></div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Activity Drawer */}
      {notificationsOpen ? (
        <div className="activity-drawer" role="dialog" aria-modal="true">
          <button className="activity-drawer__backdrop" onClick={() => setNotificationsOpen(false)} type="button" aria-label="Close activity drawer" />
          <aside className="activity-drawer__panel">
            <div className="command-palette__header">
              <div><p className="eyebrow">Activity Drawer</p><h2>Live workspace activity</h2></div>
              <button className="topbar__logout" onClick={() => setNotificationsOpen(false)} type="button">Close</button>
            </div>
            <div className="activity-drawer__section">
              <div className="sidebar__label">Notifications</div>
              <div className="command-palette__list">
                {notifications.map((item) => (
                  <div key={item.id} className={`command-palette__item command-palette__item--${item.tone}`}>
                    <strong>{item.title}</strong><span>{item.body}</span>
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
                <div className="resource-card resource-card--info"><div className="resource-card__tag">Cmd/Ctrl + K</div><p>Open quick actions and jump to another workspace instantly.</p></div>
                <div className="resource-card resource-card--success"><div className="resource-card__tag">Esc</div><p>Close overlays like quick actions or this activity drawer.</p></div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {/* Onboarding */}
      {showOnboarding ? (
        <div className="command-palette" role="dialog" aria-modal="true">
          <button className="command-palette__backdrop" onClick={() => { markOnboardingSeen(); setShowOnboarding(false); }} type="button" aria-label="Close onboarding" />
          <div className="command-palette__panel">
            <div className="command-palette__header">
              <div><p className="eyebrow">Welcome Flow</p><h2>How to show PulseOps well</h2></div>
            </div>
            <div className="resource-grid">
              <article className="resource-card resource-card--info"><div className="resource-card__tag">1. Command</div><p>Start in the Command Center to show live telemetry, AI reasoning, and threat signals.</p></article>
              <article className="resource-card resource-card--warning"><div className="resource-card__tag">2. Respond</div><p>Use War Room to show workflow, exports, prompt launchers, and response assets.</p></article>
              <article className="resource-card resource-card--success"><div className="resource-card__tag">3. Explain</div><p>Finish with Analytics Hub, Executive Suite, or Export Center depending on the audience.</p></article>
            </div>
            <div className="quick-actions">
              <button className="copilot-submit" onClick={() => { markOnboardingSeen(); setShowOnboarding(false); }} type="button">Enter Workspace</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
