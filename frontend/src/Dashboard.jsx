import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEMO_ENDPOINTS = ["/api/auth", "/api/users", "/api/orders", "/api/metrics/live", "/api/health/live"];
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";
const COPILOT_PROMPTS = [
  "Why is latency high right now?",
  "Which endpoint is failing the most?",
  "What should the on-call engineer do next?",
  "Summarize the current incident posture.",
];
const COPILOT_WORKFLOWS = [
  {
    title: "Explain The Problem",
    description: "Best first click when you want a plain-English diagnosis.",
    question: "Summarize the current incident posture.",
  },
  {
    title: "Find The Hotspot",
    description: "Use this to identify which route or service needs attention first.",
    question: "Which endpoint is failing the most?",
  },
  {
    title: "Tell Me What To Do",
    description: "Use this when you want immediate next-step guidance.",
    question: "What should the on-call engineer do next?",
  },
  {
    title: "Translate For Leaders",
    description: "Turns the technical state into business-facing language.",
    question: "Explain the current customer and business impact in simple language.",
  },
];
const AI_MODES = [
  { id: "explain", label: "Explain", prompt: "Summarize the current incident posture." },
  { id: "diagnose", label: "Diagnose", prompt: "Which endpoint is failing the most?" },
  { id: "respond", label: "Respond", prompt: "What should the on-call engineer do next?" },
  { id: "executive", label: "Executive", prompt: "Explain the current customer and business impact in simple language." },
];
const SCENARIOS = [
  { id: "normal", label: "Normal Ops" },
  { id: "latency", label: "Latency Incident" },
  { id: "auth", label: "Auth Failure" },
  { id: "bots", label: "Bot Siege" },
  { id: "cascade", label: "Dependency Cascade" },
];
const RESOURCE_CARDS = [
  {
    title: "Detection Pipeline",
    tag: "Architecture",
    tone: "info",
    text: "Traffic hits the backend, gets normalized into request events, aggregated into rolling metrics, streamed to the UI, and fed into the AI analyst.",
    bullets: ["Express API", "SSE live stream", "Rolling 60-point history"],
  },
  {
    title: "Incident Runbook",
    tag: "Response",
    tone: "warning",
    text: "Use this when reliability degrades: identify the hottest route, validate dependencies, compare healthy and failing traces, then isolate blast radius.",
    bullets: ["Check top endpoint", "Inspect error-class requests", "Review downstream systems"],
  },
  {
    title: "Capstone Demo Flow",
    tag: "Presentation",
    tone: "success",
    text: "Start demo load, narrate the live charts, switch scenarios, ask the copilot a question, then generate the incident report.",
    bullets: ["Turn demo traffic on", "Trigger scenario spikes", "Use AI summary and copilot together"],
  },
];

const COLORS = {
  success: "#4ce0b3",
  info: "#6cc3ff",
  warning: "#ffbc58",
  danger: "#ff6b7d",
  violet: "#8b7dff",
  text: "#f7f5ef",
  muted: "#b8b2a7",
  line: "rgba(255,255,255,0.08)",
};

const EMPTY_SPARK = Array.from({ length: 60 }, (_, index) => ({
  tick: index,
  rps: 0,
  latency: 0,
  errors: 0,
  "2xx": 0,
  "3xx": 0,
  "4xx": 0,
  "5xx": 0,
}));

function pick(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function classifyStatus(code) {
  if (code < 300) return "2xx";
  if (code < 400) return "3xx";
  if (code < 500) return "4xx";
  return "5xx";
}

function formatCompact(value) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function buildInsightFallback(metrics) {
  const notes = [];

  if (metrics.errorRate >= 5) {
    notes.push("Error rate is elevated enough to suggest a production incident path, not isolated noise.");
  } else if (metrics.errorRate >= 2) {
    notes.push("Client-visible failures are rising and should be watched before they cascade into a wider outage.");
  }

  if (metrics.avgLatency >= 700) {
    notes.push("Latency is deep into the red zone, which usually points to an overloaded dependency or a slow backend path.");
  } else if (metrics.avgLatency >= 350) {
    notes.push("Latency is trending above healthy interactive thresholds, so the system likely has a hot endpoint or queueing pressure.");
  }

  if (metrics.topEndpoint?.errorPct >= 8) {
    notes.push(`${metrics.topEndpoint.name} is the most likely hotspot because it pairs meaningful traffic with the highest error pressure.`);
  }

  if (!notes.length) {
    notes.push("Traffic looks stable overall, with no major reliability signal requiring immediate intervention.");
  }

  const action =
    metrics.incidentCount > 0
      ? "Prioritize the failing endpoint, validate dependency health, and compare traces between 2xx and 5xx requests."
      : "Keep watching trend lines and set a tighter threshold alert before the next load spike.";

  return `${notes.join(" ")} ${action}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map((item) => (
        <div key={`${item.name}-${item.value}`} className="chart-tooltip__row">
          <span>{item.name}</span>
          <strong>{typeof item.value === "number" ? item.value.toFixed(0) : item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ eyebrow, value, suffix, tone, detail }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__eyebrow">{eyebrow}</div>
      <div className="metric-card__value">
        {value}
        {suffix ? <span>{suffix}</span> : null}
      </div>
      <p className="metric-card__detail">{detail}</p>
    </article>
  );
}

function SignalPill({ label, value, tone }) {
  return (
    <div className={`signal-pill signal-pill--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RequestRow({ request }) {
  return (
    <div className="feed-row">
      <span className={`feed-chip feed-chip--method feed-chip--${request.method.toLowerCase()}`}>{request.method}</span>
      <span className={`feed-chip feed-chip--status feed-chip--${classifyStatus(request.status).toLowerCase()}`}>{request.status}</span>
      <span className="feed-row__endpoint">{request.endpoint}</span>
      <span className="feed-row__meta">{request.region}</span>
      <span className={`feed-row__latency ${request.latency > 800 ? "is-danger" : request.latency > 350 ? "is-warning" : ""}`}>
        {request.latency}ms
      </span>
    </div>
  );
}

function DistributionPanel({ title, items, palette }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const safeItems = items.length ? items : [{ name: "No data", value: 1 }];
  let running = 0;
  const gradientStops = safeItems
    .map((item) => {
      const value = total > 0 ? item.value : 0;
      const start = running;
      const end = start + (total > 0 ? (value / total) * 100 : 100);
      running = end;
      const color = palette[item.name] || COLORS.violet;
      return `${color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <article className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Distribution</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="distribution-card">
        <div className="distribution-donut" style={{ background: `conic-gradient(${gradientStops || `${COLORS.line} 0% 100%`})` }}>
          <div className="distribution-donut__inner">
            <strong>{total}</strong>
            <span>events</span>
          </div>
        </div>
        <div className="distribution-legend">
          {items.map((item) => {
            const percent = total ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.name} className="distribution-row">
                <div className="distribution-row__top">
                  <div className="distribution-row__label">
                    <span className="distribution-row__swatch" style={{ background: palette[item.name] || COLORS.violet }} />
                    <span>{item.name}</span>
                  </div>
                  <strong>{percent}%</strong>
                </div>
                <div className="distribution-row__track">
                  <div className="distribution-row__fill" style={{ width: `${percent}%`, background: palette[item.name] || COLORS.violet }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function ResourceCard({ card }) {
  return (
    <article className={`resource-card resource-card--${card.tone}`}>
      <div className="resource-card__tag">{card.tag}</div>
      <h3>{card.title}</h3>
      <p>{card.text}</p>
      <div className="resource-chip-row">
        {card.bullets.map((bullet) => (
          <span key={bullet} className="resource-chip">
            {bullet}
          </span>
        ))}
      </div>
    </article>
  );
}

function BotRow({ bot }) {
  return (
    <div className="bot-row">
      <div>
        <strong>{bot.name}</strong>
        <span>{bot.malicious ? "malicious bot" : bot.bot ? "benign bot" : "human traffic"}</span>
      </div>
      <div className="bot-row__stats">
        <span>{bot.requests} reqs</span>
        <span>{bot.blocked} blocks</span>
      </div>
    </div>
  );
}

function ThreatEventRow({ event }) {
  return (
    <div className="threat-row">
      <div>
        <strong>{event.agentName}</strong>
        <span>{event.endpoint}</span>
      </div>
      <div className="threat-row__meta">
        <span>{event.action}</span>
        <span>{new Date(event.ts).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function ServiceHealthRow({ service }) {
  return (
    <div className={`service-row service-row--${service.status}`}>
      <div>
        <strong>{service.name}</strong>
        <span>{service.detail}</span>
      </div>
      <div className="service-row__status">{service.status}</div>
    </div>
  );
}

function TimelineRow({ event }) {
  return (
    <div className={`timeline-row timeline-row--${event.tone}`}>
      <span className="timeline-row__dot" />
      <div>
        <strong>{event.label}</strong>
        <span>{new Date(event.ts).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function AgentCard({ name, brief, tone }) {
  return (
    <article className={`resource-card resource-card--${tone}`}>
      <div className="resource-card__tag">{name}</div>
      <p>{brief}</p>
    </article>
  );
}

function RegionMapRow({ region, value, maxValue }) {
  const width = maxValue ? Math.max(8, Math.round((value / maxValue) * 100)) : 8;
  return (
    <div className="map-row">
      <div className="map-row__label">
        <strong>{region}</strong>
        <span>{value} reqs</span>
      </div>
      <div className="map-row__track">
        <div className="map-row__fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ReplayRow({ item }) {
  return (
    <div className="replay-row">
      <span className={`replay-row__badge replay-row__badge--${item.tone}`}>{item.phase}</span>
      <div>
        <strong>{item.title}</strong>
        <p>{item.detail}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState({
    requests: [],
    sparkData: EMPTY_SPARK,
    totals: {
      totalObserved: 0,
      totalErrors: 0,
      rollingCount: 0,
      avgLatency: 0,
      errorRate: 0,
      healthScore: 100,
      currentRps: 0,
      peakRps: 0,
      incidentCount: 0,
    },
    topEndpoint: null,
    noisyEndpoint: null,
    endpointRows: [],
    botSummary: [],
    rateLimitEvents: [],
    regionDist: [],
    serviceHealth: [],
    timeline: [],
    rootCauses: [],
    alertCenter: [],
    businessImpact: { summary: "", statements: [] },
    capacity: { computeLoad: 0, cachePressure: 0, scalingRecommendation: "" },
    threatIntel: [],
    roleBriefings: {},
    architecture: {},
    auditTrail: [],
    monitoredSites: [],
    siteRows: [],
    suspiciousEvents: [],
    securityWarnings: [],
    sla: { availability: 100, latencyBudgetUsed: 0, targetAvailability: 99.9, targetP95: 450 },
    threatScore: 0,
    scenario: "normal",
    scenarioLabel: "Normal Ops",
    statusDist: [],
    methodDist: [],
  });
  const [filter, setFilter] = useState("ALL");
  const [now, setNow] = useState(new Date());
  const [streamStatus, setStreamStatus] = useState("connecting");
  const [demoMode, setDemoMode] = useState(true);
  const [activeScenario, setActiveScenario] = useState("normal");
  const [insight, setInsight] = useState({
    headline: "Building operational context",
    severity: "normal",
    summary: "Waiting for live backend telemetry.",
    actions: [],
    source: "fallback",
    updatedAt: null,
  });
  const [insightLoading, setInsightLoading] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState(COPILOT_PROMPTS[0]);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [aiMode, setAiMode] = useState("explain");
  const [copilotHint, setCopilotHint] = useState("Start with 'Explain The Problem' if you're not sure what to ask.");
  const [copilotResponse, setCopilotResponse] = useState({
    answer: "Ask the incident copilot about latency, failing endpoints, or next steps once traffic starts flowing.",
    bullets: ["The copilot uses live backend telemetry.", "It works in both OpenAI and fallback mode.", "Use it as your narrated demo assistant."],
    source: "fallback",
    updatedAt: null,
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [queryText, setQueryText] = useState("show top failing endpoint");
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const clockRef = useRef(null);
  const demoRef = useRef(null);
  const insightAbortRef = useRef(null);
  const pollingRef = useRef(null);
  const copilotAbortRef = useRef(null);

  const fetchSnapshot = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/dashboard/snapshot`);
    if (!response.ok) throw new Error(`Snapshot failed with ${response.status}`);
    return response.json();
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const data = await fetchSnapshot();
        setSnapshot((previous) => ({ ...previous, ...data }));
        setStreamStatus("polling");
      } catch (error) {
        setStreamStatus("reconnecting");
      }
    }, 2000);
  }, [fetchSnapshot]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    clockRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  useEffect(() => {
    let ignore = false;
    let eventSource = null;

    async function loadInitialSnapshot() {
      try {
        const data = await fetchSnapshot();
        if (!ignore) {
          setSnapshot((previous) => ({ ...previous, ...data }));
          setActiveScenario(data.scenario || "normal");
        }
      } catch (error) {
        if (!ignore) {
          setStreamStatus("reconnecting");
          startPolling();
        }
      }
    }

    loadInitialSnapshot();

    if (typeof EventSource !== "function") {
      setStreamStatus("reconnecting");
      startPolling();
    } else {
      eventSource = new EventSource(`${API_BASE}/api/metrics/realtime`);
      eventSource.addEventListener("connected", () => {
        setStreamStatus("live");
        stopPolling();
      });
      eventSource.addEventListener("snapshot", (event) => {
        const data = JSON.parse(event.data);
        setStreamStatus("live");
        stopPolling();
        setSnapshot(data);
        setActiveScenario(data.scenario || "normal");
      });
      eventSource.onerror = () => {
        setStreamStatus("reconnecting");
        startPolling();
      };
    }

    return () => {
      ignore = true;
      stopPolling();
      eventSource?.close();
      copilotAbortRef.current?.abort();
    };
  }, [fetchSnapshot, startPolling, stopPolling]);

  useEffect(() => {
    if (!demoMode) {
      clearInterval(demoRef.current);
      return undefined;
    }

    demoRef.current = setInterval(() => {
      const endpoint = pick(DEMO_ENDPOINTS);
      const method = endpoint.includes("orders") ? "POST" : "GET";
      fetch(`${API_BASE}${endpoint}`, { method }).catch(() => {});
    }, 260);

    return () => clearInterval(demoRef.current);
  }, [demoMode]);

  const requests = snapshot.requests || [];
  const sparkData = snapshot.sparkData?.length ? snapshot.sparkData : EMPTY_SPARK;
  const totals = snapshot.totals || {};
  const statusDist = snapshot.statusDist || [];
  const methodDist = snapshot.methodDist || [];
  const endpointRows = snapshot.endpointRows || [];
  const botSummary = snapshot.botSummary || [];
  const rateLimitEvents = snapshot.rateLimitEvents || [];
  const regionDist = snapshot.regionDist || [];
  const serviceHealth = snapshot.serviceHealth || [];
  const timeline = snapshot.timeline || [];
  const rootCauses = snapshot.rootCauses || [];
  const alertCenter = snapshot.alertCenter || [];
  const businessImpact = snapshot.businessImpact || { summary: "", statements: [] };
  const capacity = snapshot.capacity || { computeLoad: 0, cachePressure: 0, scalingRecommendation: "" };
  const threatIntel = snapshot.threatIntel || [];
  const roleBriefings = snapshot.roleBriefings || {};
  const architecture = snapshot.architecture || {};
  const auditTrail = snapshot.auditTrail || [];
  const monitoredSites = snapshot.monitoredSites || [];
  const siteRows = snapshot.siteRows || [];
  const suspiciousEvents = snapshot.suspiciousEvents || [];
  const securityWarnings = snapshot.securityWarnings || [];
  const sla = snapshot.sla || { availability: 100, latencyBudgetUsed: 0, targetAvailability: 99.9, targetP95: 450 };
  const threatScore = snapshot.threatScore || 0;
  const topEndpoint = snapshot.topEndpoint || null;
  const noisyEndpoint = snapshot.noisyEndpoint || null;

  const totalReqs = totals.rollingCount || 0;
  const avgLatency = totals.avgLatency || 0;
  const errorRate = totals.errorRate || 0;
  const curRps = totals.currentRps || 0;
  const peakRps = totals.peakRps || 0;
  const incidentCount = totals.incidentCount || 0;
  const healthScore = totals.healthScore ?? 100;
  const healthTone = healthScore >= 80 ? "success" : healthScore >= 60 ? "warning" : "danger";
  const healthLabel = healthScore >= 80 ? "Stable" : healthScore >= 60 ? "Degraded" : "Incident";

  const filteredRequests = requests.filter((request) => {
    if (filter === "ALL") return true;
    if (filter === "BOT") return request.bot;
    if (filter === "SLOW") return request.latency > 900;
    return classifyStatus(request.status) === filter;
  });

  const insightPayload = useMemo(
    () => ({
      rps: curRps,
      peakRps,
      avgLatency,
      errorRate: Number(errorRate.toFixed(1)),
      healthScore,
      incidentCount,
      topEndpoint: topEndpoint
        ? {
            name: topEndpoint.name,
            avgLatency: topEndpoint.avgLatency,
            errorPct: Number(topEndpoint.errorPct.toFixed(1)),
            traffic: topEndpoint.count,
          }
        : null,
      noisyEndpoint: noisyEndpoint
        ? {
            name: noisyEndpoint.name,
            avgLatency: noisyEndpoint.avgLatency,
            errorPct: Number(noisyEndpoint.errorPct.toFixed(1)),
          }
        : null,
    }),
    [avgLatency, curRps, errorRate, healthScore, incidentCount, noisyEndpoint, peakRps, topEndpoint],
  );

  const stageCards = [
    { label: "Detect", value: `${errorRate.toFixed(1)}% error rate`, tone: errorRate >= 2 ? "warning" : "success" },
    { label: "Diagnose", value: noisyEndpoint?.name || "No dominant hotspot", tone: noisyEndpoint ? "danger" : "info" },
    { label: "Respond", value: topEndpoint ? `Inspect ${topEndpoint.name}` : "Capture baseline", tone: "info" },
    { label: "Recover", value: `${healthScore}/100 health`, tone: healthTone },
  ];

  const statusBanner = healthScore >= 80
    ? { tone: "success", title: "System stable", detail: "Latency, failures, and threat pressure are all within manageable operating thresholds." }
    : healthScore >= 60
      ? { tone: "warning", title: "System degraded", detail: "The platform is under visible reliability pressure and should be monitored closely." }
      : { tone: "danger", title: "Active incident posture", detail: "Reliability and threat signals indicate that the platform should be treated like an active incident." };

  const multiAgentCards = [
    { name: "SRE Agent", brief: roleBriefings.sre || "Waiting for live telemetry context.", tone: "info" },
    { name: "Security Agent", brief: roleBriefings.security || "Security posture will populate here.", tone: "warning" },
    { name: "Commander Agent", brief: roleBriefings.commander || "Incident command guidance will appear here.", tone: "success" },
    { name: "Executive Agent", brief: roleBriefings.executive || "Executive-level framing will appear here.", tone: "info" },
  ];

  const maxRegionValue = Math.max(...regionDist.map((item) => item.value), 0);
  const replayItems = [
    {
      phase: "Detect",
      tone: errorRate >= 5 ? "danger" : "info",
      title: errorRate >= 5 ? "Failure signal crossed incident threshold" : "Telemetry baseline captured",
      detail: `${errorRate.toFixed(1)}% error rate with ${curRps} req/s at ${new Date().toLocaleTimeString()}.`,
    },
    {
      phase: "Diagnose",
      tone: noisyEndpoint ? "warning" : "info",
      title: noisyEndpoint ? `${noisyEndpoint.name} emerged as the noisiest route` : "No dominant noisy route yet",
      detail: noisyEndpoint ? `${noisyEndpoint.errorPct.toFixed(1)}% error concentration and ${noisyEndpoint.avgLatency}ms average latency.` : "The platform is still distributing load without a clear hotspot.",
    },
    {
      phase: "Threat",
      tone: threatScore >= 45 ? "danger" : "warning",
      title: threatScore >= 45 ? "Threat pressure materially affected the platform" : "Threat posture remains controlled",
      detail: `${threatScore}/100 threat score with ${rateLimitEvents.length} recent mitigation events.`,
    },
    {
      phase: "Respond",
      tone: report ? "success" : "info",
      title: report ? "Incident report available for handoff" : "Use copilot, war room, and report generator next",
      detail: report ? report.executiveSummary : "The suite can now move from diagnosis to communication and export.",
    },
  ];

  const collaborationRows = alertCenter.map((alert, index) => ({
    ...alert,
    ownerNote:
      index === 0
        ? "Primary assignee should drive the next update."
        : "Track this in parallel while the main incident is being stabilized.",
  }));

  const regionPalette = { "us-west": COLORS.info, "us-central": COLORS.violet, "us-east": COLORS.success, "eu-west": COLORS.warning };

  async function submitCopilotQuestion(question) {
    const trimmed = question.trim();
    if (!trimmed) return;

    setCopilotHint("The copilot is reading the live telemetry snapshot and turning it into actions.");
    copilotAbortRef.current?.abort();
    const controller = new AbortController();
    copilotAbortRef.current = controller;
    setCopilotLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Copilot request failed with ${response.status}`);
      const data = await response.json();
      setCopilotResponse({
        answer: data.answer,
        bullets: Array.isArray(data.bullets) ? data.bullets : [],
        source: data.source || "fallback",
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        setCopilotResponse({
          answer: "The copilot could not reach the model, so it is falling back to telemetry-driven guidance.",
          bullets: [
            "Ask about latency, endpoints, or recommended next steps.",
            "Keep demo load on if you want the answers to feel more dynamic.",
            "The fallback mode still uses the current backend snapshot.",
          ],
          source: "fallback",
          updatedAt: new Date().toISOString(),
        });
      }
    } finally {
      if (!controller.signal.aborted) setCopilotLoading(false);
    }
  }

  function launchWorkflow(workflow) {
    setCopilotQuestion(workflow.question);
    setCopilotHint(workflow.description);
    submitCopilotQuestion(workflow.question);
  }

  function applyAiMode(mode) {
    setAiMode(mode.id);
    setCopilotQuestion(mode.prompt);
    setCopilotHint(`Mode: ${mode.label}. Click Ask Copilot or use this as your starting question.`);
  }

  async function triggerSpike() {
    try {
      await fetch(`${API_BASE}/api/demo/spike`, { method: "POST" });
    } catch (error) {}
  }

  async function activateScenario(scenario) {
    setActiveScenario(scenario);
    try {
      await fetch(`${API_BASE}/api/demo/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
    } catch (error) {}
  }

  async function generateReport() {
    setReportLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/report`, { method: "POST" });
      if (!response.ok) throw new Error(`Report request failed with ${response.status}`);
      setReport(await response.json());
    } catch (error) {
      setReport({
        title: "Incident Report",
        executiveSummary: "Unable to generate the report from the backend right now.",
        impact: "Try again after confirming the backend is reachable.",
        rootCause: "No report data returned.",
        actions: ["Retry report generation", "Confirm backend health", "Use AI summary and copilot as backup presentation material"],
        generatedAt: new Date().toISOString(),
      });
    } finally {
      setReportLoading(false);
    }
  }

  async function runQuery(query) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setQueryLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      if (!response.ok) throw new Error(`Query failed with ${response.status}`);
      setQueryResult(await response.json());
    } catch (error) {
      setQueryResult({ title: "Query failed", body: "The query console could not retrieve a response from the backend." });
    } finally {
      setQueryLoading(false);
    }
  }

  useEffect(() => {
    if (!totalReqs) return undefined;

    const timeout = setTimeout(async () => {
      insightAbortRef.current?.abort();
      const controller = new AbortController();
      insightAbortRef.current = controller;
      setInsightLoading(true);

      try {
        const response = await fetch(`${API_BASE}/api/insights`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(insightPayload),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Insight request failed with ${response.status}`);
        const data = await response.json();
        setInsight({
          headline: data.headline || "Operational narrative",
          severity: data.severity || "normal",
          summary: data.summary || buildInsightFallback(insightPayload),
          actions: Array.isArray(data.actions) ? data.actions : [],
          source: data.source || "fallback",
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setInsight({
            headline: "Rules-based incident brief",
            severity:
              insightPayload.errorRate >= 5 || insightPayload.avgLatency >= 700
                ? "high"
                : insightPayload.errorRate >= 2 || insightPayload.avgLatency >= 350
                  ? "medium"
                  : "normal",
            summary: buildInsightFallback(insightPayload),
            actions:
              insightPayload.incidentCount > 0
                ? [
                    "Inspect the failing endpoint first.",
                    "Check downstream dependencies and recent deploys.",
                    "Compare fast requests against slow traces for clues.",
                  ]
                : [
                    "Capture a healthy baseline for comparison.",
                    "Tighten alert thresholds for 5xx and latency spikes.",
                    "Prepare a short runbook for the busiest endpoint.",
                  ],
            source: "fallback",
            updatedAt: new Date().toISOString(),
          });
        }
      } finally {
        if (!controller.signal.aborted) setInsightLoading(false);
      }
    }, 1200);

    return () => {
      clearTimeout(timeout);
      insightAbortRef.current?.abort();
    };
  }, [insightPayload, totalReqs]);

  const alerts = [
    errorRate >= 5 ? { tone: "danger", title: "5xx spike", body: "Failure volume is high enough to affect user trust. Triage the hottest endpoint first." } : null,
    avgLatency >= 450 ? { tone: "warning", title: "Latency regression", body: "Median experience is drifting slower than healthy interactive thresholds." } : null,
    noisyEndpoint?.errorPct >= 8 ? { tone: "info", title: "Endpoint hotspot", body: `${noisyEndpoint.name} is generating the noisiest reliability signal in the window.` } : null,
    threatScore >= 45 ? { tone: "danger", title: "Threat score elevated", body: `Threat score is ${threatScore}/100 due to bot activity and recent rate-limit events.` } : null,
  ].filter(Boolean);

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">Spring 2026 Capstone</p>
          <h1>PulseOps Command Center</h1>
          <p className="hero-panel__lede">
            A real-time API traffic cockpit driven by backend events, with live health scoring, anomaly detection, threat intelligence, AI incident analysis, guided response, and scenario-based operations demos.
          </p>
          <div className="stage-row">
            {stageCards.map((card) => (
              <div key={card.label} className={`stage-card stage-card--${card.tone}`}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-panel__meta">
          <SignalPill label="Stream" value={streamStatus === "live" ? "Connected" : streamStatus === "polling" ? "Polling" : "Reconnecting"} tone={streamStatus === "live" ? "success" : streamStatus === "polling" ? "info" : "warning"} />
          <SignalPill label="Health" value={`${healthScore}/100`} tone={healthTone} />
          <SignalPill label="Threat" value={`${threatScore}/100`} tone={threatScore >= 45 ? "danger" : threatScore >= 20 ? "warning" : "success"} />
          <SignalPill label="Scenario" value={snapshot.scenarioLabel || "Normal Ops"} tone="info" />
          <SignalPill label="Copilot" value={copilotResponse.source === "openai" ? "OpenAI" : "Fallback"} tone={copilotResponse.source === "openai" ? "success" : "warning"} />
          <SignalPill label="Local Time" value={now.toLocaleTimeString()} tone="neutral" />
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard eyebrow="Current throughput" value={curRps} suffix="req/s" tone="info" detail={`Peak ${peakRps} req/s in the last minute`} />
        <MetricCard eyebrow="Average latency" value={avgLatency} suffix="ms" tone={avgLatency >= 450 ? "danger" : avgLatency >= 250 ? "warning" : "success"} detail="Computed from live backend requests" />
        <MetricCard eyebrow="Error rate" value={errorRate.toFixed(1)} suffix="%" tone={errorRate >= 5 ? "danger" : errorRate >= 2 ? "warning" : "success"} detail={`${incidentCount} incident-class requests detected`} />
        <MetricCard eyebrow="Observed traffic" value={formatCompact(totals.totalObserved || 0)} tone="violet" detail={topEndpoint ? `${topEndpoint.name} is carrying the most traffic` : "Waiting for endpoint data"} />
      </section>

      <section className="systems-grid">
        <article className={`panel panel--${statusBanner.tone === "danger" ? "alerts" : "resources"} incident-banner`}>
          <div className="panel__header">
            <div>
              <p className="eyebrow">Incident status</p>
              <h2>{statusBanner.title}</h2>
            </div>
            <span className={`badge badge--${statusBanner.tone}`}>{snapshot.scenarioLabel}</span>
          </div>
          <p className="insight-copy">{statusBanner.detail}</p>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Why it matters</p>
              <h2>Customer + business translation</h2>
            </div>
          </div>
          <div className="report-actions">
            {businessImpact.statements.map((statement) => (
              <div key={statement} className="copilot-bullet">
                <span className="insight-action__dot" />
                <span>{statement}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="scenario-grid">
        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Scenario Lab</p>
              <h2>Demo controls</h2>
            </div>
            <button className="pause-button" onClick={() => setDemoMode((current) => !current)}>{demoMode ? "Stop demo load" : "Start demo load"}</button>
          </div>
          <div className="scenario-actions">
            {SCENARIOS.map((scenario) => (
              <button key={scenario.id} className={`scenario-chip ${activeScenario === scenario.id ? "is-active" : ""}`} onClick={() => activateScenario(scenario.id)}>
                {scenario.label}
              </button>
            ))}
            <button className="scenario-chip is-danger" onClick={triggerSpike}>Trigger spike</button>
          </div>
          <div className="alert-stack">
            <div className="alert-card alert-card--info">
              <strong>Live backend mode</strong>
              <p>The frontend is reading server-sent events from `/api/metrics/realtime` and falling back to direct polling if the stream drops.</p>
            </div>
            {alerts.length ? alerts.map((alert) => (
              <div key={alert.title} className={`alert-card alert-card--${alert.tone}`}>
                <strong>{alert.title}</strong>
                <p>{alert.body}</p>
              </div>
            )) : (
              <div className="alert-card alert-card--success">
                <strong>System calm</strong>
                <p>No critical conditions detected in the rolling window.</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Reliability posture</p>
              <h2>SLA + service mesh</h2>
            </div>
          </div>
          <div className="sla-grid">
            <div className="sla-card">
              <span>Availability</span>
              <strong>{sla.availability}%</strong>
              <p>Target {sla.targetAvailability}%</p>
            </div>
            <div className="sla-card">
              <span>Latency budget</span>
              <strong>{sla.latencyBudgetUsed}%</strong>
              <p>Target p95 under {sla.targetP95}ms</p>
            </div>
          </div>
          <div className="service-list">
            {serviceHealth.map((service) => (
              <ServiceHealthRow key={service.name} service={service} />
            ))}
          </div>
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Website coverage</p>
              <h2>Multi-site monitoring</h2>
            </div>
            <span className="badge badge--info">{monitoredSites.length} sites</span>
          </div>
          <div className="service-list">
            {siteRows.length ? siteRows.slice(0, 4).map((site) => (
              <div key={site.siteKey} className="service-row service-row--info">
                <div>
                  <strong>{site.name}</strong>
                  <span>{site.domain}</span>
                  <span>{site.requests} requests · {site.bots} bot hits · {site.warnings} warnings</span>
                </div>
                <div className="service-row__status">{site.errorRate}% error</div>
              </div>
            )) : (
              <div className="alert-card alert-card--info">
                <strong>Collector ready for websites</strong>
                <p>Use the Website Monitor page to register a domain, copy the snippet, and send live telemetry into PulseOps.</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Security watch</p>
              <h2>Illegal activity warnings</h2>
            </div>
          </div>
          <div className="service-list">
            {securityWarnings.length ? securityWarnings.map((warning) => (
              <div key={warning.id} className={`service-row service-row--${warning.severity}`}>
                <div>
                  <strong>{warning.title}</strong>
                  <span>{warning.detail}</span>
                </div>
                <div className="service-row__status">{warning.severity}</div>
              </div>
            )) : (
              <div className="alert-card alert-card--success">
                <strong>No illegal patterns detected</strong>
                <p>PulseOps is watching for admin probing, auth abuse, and malicious automation across connected websites.</p>
              </div>
            )}
            {suspiciousEvents.slice(0, 2).map((event) => (
              <div key={event.id} className={`service-row service-row--${event.severity}`}>
                <div>
                  <strong>{event.siteName || "Website"} · {event.endpoint}</strong>
                  <span>{event.warnings?.join(", ") || "Suspicious activity detected"}</span>
                </div>
                <div className="service-row__status">{event.status}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="operator-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Root Cause Engine</p>
              <h2>Likely causes</h2>
            </div>
          </div>
          <div className="cause-list">
            {rootCauses.map((cause) => (
              <div key={cause.title} className="cause-row">
                <strong>{cause.title}</strong>
                <span>{cause.evidence}</span>
                <div className="cause-row__confidence">Confidence {(cause.confidence * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Alerting Center</p>
              <h2>Escalations</h2>
            </div>
          </div>
          <div className="service-list">
            {alertCenter.map((alert) => (
              <div key={alert.id} className={`service-row service-row--${alert.severity}`}>
                <div>
                  <strong>{alert.title}</strong>
                  <span>{alert.owner}</span>
                </div>
                <div className="service-row__status">{alert.state}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="command-layout">
        <article className="panel panel--insight">
          <div className="panel__header">
            <div>
              <p className="eyebrow">AI assisted summary</p>
              <h2>Operational narrative</h2>
            </div>
            <span className={`badge badge--${insight.source === "openai" ? "info" : "neutral"}`}>
              {insightLoading ? "Updating" : insight.source === "openai" ? "OpenAI" : "Fallback"}
            </span>
          </div>
          <div className={`insight-headline insight-headline--${insight.severity || "normal"}`}>{insight.headline}</div>
          <p className="insight-copy">{insight.summary}</p>
          <div className="insight-actions">
            {insight.actions.map((action) => (
              <div key={action} className="insight-action">
                <span className="insight-action__dot" />
                <span>{action}</span>
              </div>
            ))}
          </div>
          <div className="insight-meta">
            <span>Service state: {healthLabel}</span>
            <span>{insight.updatedAt ? `Refreshed ${new Date(insight.updatedAt).toLocaleTimeString()}` : "Waiting for first snapshot"}</span>
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Incident timeline</p>
              <h2>Operational events</h2>
            </div>
          </div>
          <div className="timeline-list">
            {timeline.length ? timeline.map((event) => <TimelineRow key={event.id} event={event} />) : (
              <div className="alert-card alert-card--success">
                <strong>No major events yet</strong>
                <p>Timeline cards appear when latency, failures, or bot activity cross thresholds.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="briefing-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Multi-agent AI</p>
              <h2>Mission briefings</h2>
            </div>
          </div>
          <div className="briefing-grid__cards">
            {multiAgentCards.map((card) => (
              <AgentCard key={card.name} name={card.name} brief={card.brief} tone={card.tone} />
            ))}
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Query Console</p>
              <h2>Natural language telemetry search</h2>
            </div>
          </div>
          <form className="copilot-form" onSubmit={(event) => { event.preventDefault(); runQuery(queryText); }}>
            <input className="copilot-input query-input" value={queryText} onChange={(event) => setQueryText(event.target.value)} />
            <button className="copilot-submit" type="submit">{queryLoading ? "Running..." : "Run Query"}</button>
          </form>
          <div className="copilot-response">
            <p>{queryResult?.body || "Use the query console to ask things like 'show bot activity' or 'top failing endpoint'."}</p>
            <div className="copilot-meta">
              <span>{queryResult?.title || "No query run yet"}</span>
            </div>
          </div>
        </article>
      </section>

      <section className="intel-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Threat intelligence</p>
              <h2>Bot traffic analysis</h2>
            </div>
          </div>
          <div className="bot-list">
            {botSummary.slice(0, 6).map((bot) => <BotRow key={bot.name} bot={bot} />)}
          </div>
          <div className="resource-chip-row">
            {threatIntel.map((item) => (
              <span key={item.name} className="resource-chip">
                {item.name} · {item.classification} · {item.risk}
              </span>
            ))}
          </div>
        </article>
        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Threat feed</p>
              <h2>Rate-limit events</h2>
            </div>
          </div>
          <div className="threat-list">
            {rateLimitEvents.length ? rateLimitEvents.map((event) => <ThreatEventRow key={event.id} event={event} />) : (
              <div className="alert-card alert-card--success">
                <strong>No active bot blocks</strong>
                <p>Rate-limited events will appear here when malicious agents trigger 429 responses.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Live threat map</p>
              <h2>Regional activity surface</h2>
            </div>
          </div>
          <div className="map-surface">
            <div className="map-surface__glow" />
            <div className="map-list">
              {regionDist.length ? regionDist.map((item) => (
                <RegionMapRow key={item.name} region={item.name} value={item.value} maxValue={maxRegionValue} />
              )) : (
                <div className="alert-card alert-card--info">
                  <strong>Region feed waiting</strong>
                  <p>Regional traffic will populate once the backend has enough request volume.</p>
                </div>
              )}
            </div>
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Team coordination</p>
              <h2>Collaboration board</h2>
            </div>
          </div>
          <div className="service-list">
            {collaborationRows.map((row) => (
              <div key={row.id} className={`service-row service-row--${row.severity}`}>
                <div>
                  <strong>{row.owner}</strong>
                  <span>{row.title}</span>
                  <span>{row.ownerNote}</span>
                </div>
                <div className="service-row__status">{row.state}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Incident replay</p>
              <h2>Playback timeline</h2>
            </div>
          </div>
          <div className="replay-list">
            {replayItems.map((item) => (
              <ReplayRow key={item.phase} item={item} />
            ))}
          </div>
        </article>

        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Dependency graph</p>
              <h2>Service relationships</h2>
            </div>
          </div>
          <div className="dependency-grid">
            {Object.entries(architecture).map(([layer, nodes]) => (
              <div key={layer} className="dependency-column">
                <div className="resource-card__tag">{layer}</div>
                <div className="dependency-column__stack">
                  {nodes.map((node) => (
                    <div key={node} className="dependency-node">{node}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="copilot-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Interactive AI</p>
              <h2>Incident Copilot</h2>
            </div>
            <span className={`badge badge--${copilotResponse.source === "openai" ? "info" : "neutral"}`}>
              {copilotLoading ? "Thinking" : copilotResponse.source === "openai" ? "OpenAI" : "Fallback"}
            </span>
          </div>
          <div className="copilot-helper">
            <div className="copilot-helper__intro">
              <strong>How to use it</strong>
              <p>{copilotHint}</p>
            </div>
            <div className="ai-mode-tabs">
              {AI_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`ai-mode-tab ${aiMode === mode.id ? "is-active" : ""}`}
                  onClick={() => applyAiMode(mode)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="copilot-workflows">
              {COPILOT_WORKFLOWS.map((workflow) => (
                <button
                  key={workflow.title}
                  type="button"
                  className="copilot-workflow"
                  onClick={() => launchWorkflow(workflow)}
                >
                  <span>{workflow.title}</span>
                  <strong>{workflow.description}</strong>
                </button>
              ))}
            </div>
          </div>
          <form className="copilot-form" onSubmit={(event) => { event.preventDefault(); submitCopilotQuestion(copilotQuestion); }}>
            <textarea className="copilot-input" value={copilotQuestion} onChange={(event) => setCopilotQuestion(event.target.value)} placeholder="Ask about latency, endpoints, root cause, or next actions." />
            <div className="copilot-actions">
              {COPILOT_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" className="copilot-chip" onClick={() => { setCopilotQuestion(prompt); submitCopilotQuestion(prompt); }}>
                  {prompt}
                </button>
              ))}
            </div>
            <button className="copilot-submit" type="submit">{copilotLoading ? "Analyzing..." : "Ask Copilot"}</button>
          </form>
          <div className="copilot-response">
            <p>{copilotResponse.answer}</p>
            <div className="copilot-bullets">
              {copilotResponse.bullets.map((bullet) => (
                <div key={bullet} className="copilot-bullet">
                  <span className="insight-action__dot" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
            <div className="copilot-meta">
              <span>{copilotResponse.source === "openai" ? "Model-backed reasoning" : "Telemetry-backed fallback"}</span>
              <span>{copilotResponse.updatedAt ? `Updated ${new Date(copilotResponse.updatedAt).toLocaleTimeString()}` : "Waiting for first question"}</span>
            </div>
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Capstone resources</p>
              <h2>Response deck</h2>
            </div>
          </div>
          <div className="resource-grid">
            {RESOURCE_CARDS.map((card) => <ResourceCard key={card.title} card={card} />)}
          </div>
        </article>
      </section>

      <section className="reports-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Executive view</p>
              <h2>Incident report generator</h2>
            </div>
            <button className="pause-button" onClick={generateReport}>{reportLoading ? "Generating..." : "Generate report"}</button>
          </div>
          {report ? (
            <div className="report-card">
              <h3>{report.title}</h3>
              <p><strong>Executive summary:</strong> {report.executiveSummary}</p>
              <p><strong>Impact:</strong> {report.impact}</p>
              <p><strong>Likely root cause:</strong> {report.rootCause}</p>
              <div className="report-actions">
                {report.actions.map((action) => (
                  <div key={action} className="copilot-bullet">
                    <span className="insight-action__dot" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="alert-card alert-card--info">
              <strong>No report generated yet</strong>
              <p>Use this button during your presentation to generate a polished incident brief from the live telemetry snapshot.</p>
            </div>
          )}
        </article>

        <DistributionPanel title="Regional traffic" items={regionDist} palette={regionPalette} />
      </section>

      <section className="systems-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Executive Mode</p>
              <h2>Business impact</h2>
            </div>
          </div>
          <div className="report-card">
            <p>{businessImpact.summary}</p>
            <div className="report-actions">
              {businessImpact.statements.map((statement) => (
                <div key={statement} className="copilot-bullet">
                  <span className="insight-action__dot" />
                  <span>{statement}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Capacity Analyzer</p>
              <h2>Scale planning</h2>
            </div>
          </div>
          <div className="sla-grid">
            <div className="sla-card">
              <span>Compute load</span>
              <strong>{capacity.computeLoad}%</strong>
              <p>Gateway and service compute demand estimate</p>
            </div>
            <div className="sla-card">
              <span>Cache pressure</span>
              <strong>{capacity.cachePressure}%</strong>
              <p>Threat and latency-driven cache stress indicator</p>
            </div>
          </div>
          <div className="alert-card alert-card--info">
            <strong>Recommendation</strong>
            <p>{capacity.scalingRecommendation}</p>
          </div>
        </article>
      </section>

      <section className="systems-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Architecture Viewer</p>
              <h2>Platform map</h2>
            </div>
          </div>
          <div className="architecture-grid">
            {Object.entries(architecture).map(([layer, nodes]) => (
              <div key={layer} className="resource-card resource-card--success">
                <div className="resource-card__tag">{layer}</div>
                <div className="resource-chip-row">
                  {nodes.map((node) => (
                    <span key={node} className="resource-chip">{node}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Compliance Trail</p>
              <h2>Audit log</h2>
            </div>
          </div>
          <div className="threat-list">
            {auditTrail.length ? auditTrail.map((entry) => (
              <div key={entry.id} className="threat-row">
                <div>
                  <strong>{entry.action}</strong>
                  <span>{entry.detail}</span>
                </div>
                <div className="threat-row__meta">
                  <span>{entry.actor}</span>
                  <span>{new Date(entry.ts).toLocaleTimeString()}</span>
                </div>
              </div>
            )) : (
              <div className="alert-card alert-card--success">
                <strong>No audit events yet</strong>
                <p>Scenario changes, spikes, queries, and reports will be tracked here.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="chart-grid">
        <article className="panel">
          <div className="panel__header">
            <div><p className="eyebrow">Traffic</p><h2>Requests per second</h2></div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.info} stopOpacity={0.42} />
                  <stop offset="100%" stopColor={COLORS.info} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="tick" hide />
              <YAxis tick={{ fill: "#b8b2a7", fontSize: 11 }} width={34} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="rps" stroke={COLORS.info} fill="url(#throughputGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="panel">
          <div className="panel__header">
            <div><p className="eyebrow">Responsiveness</p><h2>Latency trend</h2></div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.violet} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={COLORS.violet} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="tick" hide />
              <YAxis tick={{ fill: "#b8b2a7", fontSize: 11 }} width={38} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="latency" stroke={COLORS.violet} fill="url(#latencyGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="panel panel--wide">
          <div className="panel__header">
            <div><p className="eyebrow">Composition</p><h2>Status mix over time</h2></div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sparkData.slice(-24)}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="tick" hide />
              <YAxis tick={{ fill: "#b8b2a7", fontSize: 11 }} width={34} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="2xx" stackId="status" fill={COLORS.success} />
              <Bar dataKey="3xx" stackId="status" fill={COLORS.info} />
              <Bar dataKey="4xx" stackId="status" fill={COLORS.warning} />
              <Bar dataKey="5xx" stackId="status" fill={COLORS.danger} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <DistributionPanel title="Status classes" items={statusDist} palette={{ "2xx": COLORS.success, "3xx": COLORS.info, "4xx": COLORS.warning, "5xx": COLORS.danger }} />
        <DistributionPanel title="HTTP methods" items={methodDist} palette={{ GET: COLORS.info, POST: COLORS.success, PUT: COLORS.violet, DELETE: COLORS.danger, PATCH: COLORS.warning }} />
      </section>

      <section className="ops-grid">
        <article className="panel">
          <div className="panel__header">
            <div><p className="eyebrow">Hot paths</p><h2>Endpoint reliability</h2></div>
          </div>
          <div className="endpoint-table">
            <div className="endpoint-table__head">
              <span>Endpoint</span><span>Traffic</span><span>Avg</span><span>P95</span><span>Error</span>
            </div>
            {endpointRows.slice(0, 5).map((row) => (
              <div key={row.name} className="endpoint-table__row">
                <span className="endpoint-table__path">{row.name}</span>
                <span>{row.count}</span>
                <span>{row.avgLatency}ms</span>
                <span>{row.p95}ms</span>
                <span className={row.errorPct >= 8 ? "is-danger" : row.errorPct >= 3 ? "is-warning" : ""}>{row.errorPct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel__header">
            <div><p className="eyebrow">Live telemetry</p><h2>Request stream</h2></div>
            <div className="filter-row">
              {["ALL", "2xx", "4xx", "5xx", "BOT", "SLOW"].map((option) => (
                <button key={option} className={`filter-button ${filter === option ? "is-active" : ""}`} onClick={() => setFilter(option)}>
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="feed-list">
            {filteredRequests.slice(0, 36).map((request) => <RequestRow key={request.id} request={request} />)}
          </div>
        </article>
      </section>
    </main>
  );
}
