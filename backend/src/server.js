const express = require("express");
const cors = require("cors");
const redis = require("redis");
const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 9000;
const HOST = process.env.HOST || "0.0.0.0";
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const ENABLE_REDIS = process.env.ENABLE_REDIS === "true";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

if (ENABLE_REDIS) {
  const redisClient = redis.createClient({ socket: { host: REDIS_HOST, port: REDIS_PORT } });
  redisClient.on("error", (error) => console.error("Redis error:", error.message));
  redisClient
    .connect()
    .then(() => console.log("Redis connected"))
    .catch((error) => console.error("Redis connect failed:", error.message));
}

const sseClients = new Set();
const historyLimit = 60;
const requestLimit = 240;
const regionPool = ["us-west", "us-central", "us-east", "eu-west"];
const scenarioMap = {
  "/api/auth": { okMin: 30, okMax: 180, failMin: 320, failMax: 1100 },
  "/api/users": { okMin: 40, okMax: 240, failMin: 420, failMax: 1200 },
  "/api/orders": { okMin: 80, okMax: 420, failMin: 700, failMax: 1800 },
  "/api/metrics": { okMin: 20, okMax: 120, failMin: 240, failMax: 700 },
  "/api/health": { okMin: 10, okMax: 70, failMin: 120, failMax: 300 },
};
const DEMO_SIMULATION_ENDPOINTS = ["/api/auth", "/api/users", "/api/orders", "/api/metrics/live", "/api/health/live"];
const agents = [
  { name: "Chrome-Client", bot: false, malicious: false, weight: 20 },
  { name: "Safari-Mobile", bot: false, malicious: false, weight: 18 },
  { name: "Googlebot", bot: true, malicious: false, weight: 8 },
  { name: "OpenAI-SearchBot", bot: true, malicious: false, weight: 6 },
  { name: "Bingbot", bot: true, malicious: false, weight: 5 },
  { name: "AttackBot-X", bot: true, malicious: true, weight: 4 },
  { name: "DataMiner-3", bot: true, malicious: true, weight: 3 },
  { name: "Credential-Stuffer", bot: true, malicious: true, weight: 2 },
];
const SCENARIOS = {
  normal: { label: "Normal Ops", errorMultiplier: 1, latencyMultiplier: 1, botMultiplier: 1 },
  latency: { label: "Latency Incident", errorMultiplier: 1.2, latencyMultiplier: 2.4, botMultiplier: 1 },
  auth: { label: "Auth Failure", errorMultiplier: 2.1, latencyMultiplier: 1.4, botMultiplier: 1.1, focus: "/api/auth" },
  bots: { label: "Bot Siege", errorMultiplier: 1.6, latencyMultiplier: 1.2, botMultiplier: 2.8 },
  cascade: { label: "Dependency Cascade", errorMultiplier: 2.4, latencyMultiplier: 2.6, botMultiplier: 1.2, focus: "/api/orders" },
};
const ARCHITECTURE = {
  ingress: ["Client Apps", "Bots", "Partner Integrations"],
  edge: ["API Gateway", "Threat Shield", "Rate Limiter"],
  core: ["Auth Service", "Orders API", "Metrics Aggregator", "Incident Engine"],
  intelligence: ["AI Narrative", "Incident Copilot", "Executive Reporter"],
};
const DEFAULT_SITE = {
  siteKey: "site_demo_pulseops",
  name: "PulseOps Demo Site",
  domain: "demo.pulseops.local",
  createdAt: new Date().toISOString(),
  status: "active",
};
const DEFAULT_EDGE_POLICY = {
  securityMode: "balanced",
  wafMode: "simulate",
  rateLimitMode: "adaptive",
  botFightMode: "managed",
  cacheMode: "smart",
  underAttack: false,
};
const KNOWN_BOT_PATTERNS = [/bot/i, /crawler/i, /spider/i, /headless/i, /curl/i, /python-requests/i, /scrapy/i];
const MALICIOUS_PATTERNS = [/attackbot/i, /credential/i, /sqlmap/i, /nikto/i, /masscan/i, /nmap/i];
const ILLEGAL_PATH_PATTERNS = [
  /wp-admin/i,
  /wp-login/i,
  /xmlrpc/i,
  /\.env/i,
  /phpmyadmin/i,
  /\/admin/i,
  /\/login/i,
  /\/config/i,
  /\/shell/i,
  /\.\.\//i,
];
const COUNTRY_BY_REGION = {
  "us-west": "United States",
  "us-central": "United States",
  "us-east": "United States",
  "eu-west": "Germany",
  browser: "Browser Region",
};
const ASN_POOL = ["Cloudflare", "AWS", "DigitalOcean", "Google Cloud", "Akamai", "Unknown Network"];
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "pulseops.db");
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    organization TEXT,
    role TEXT,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sites (
    site_key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    api_key TEXT NOT NULL,
    owner_email TEXT
  );

  CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_key TEXT,
    channel TEXT NOT NULL,
    target TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_delivery_at TEXT
  );

  CREATE TABLE IF NOT EXISTS shared_reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS history_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_key TEXT NOT NULL,
    ts INTEGER NOT NULL,
    rps INTEGER NOT NULL,
    latency INTEGER NOT NULL,
    error_rate REAL NOT NULL,
    threat_score REAL NOT NULL,
    risk_score REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS edge_policies (
    site_key TEXT PRIMARY KEY,
    security_mode TEXT NOT NULL,
    waf_mode TEXT NOT NULL,
    rate_limit_mode TEXT NOT NULL,
    bot_fight_mode TEXT NOT NULL,
    cache_mode TEXT NOT NULL,
    under_attack INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_runtime_config (
    site_key TEXT PRIMARY KEY,
    traffic_mode TEXT NOT NULL,
    sample_rate INTEGER NOT NULL,
    ingest_logs INTEGER NOT NULL DEFAULT 1,
    allow_demo INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS automation_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_key TEXT,
    name TEXT NOT NULL,
    metric_key TEXT NOT NULL,
    comparator TEXT NOT NULL,
    threshold_value REAL NOT NULL,
    action_type TEXT NOT NULL,
    action_config_json TEXT NOT NULL,
    cooldown_seconds INTEGER NOT NULL DEFAULT 300,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_triggered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS automation_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER NOT NULL,
    rule_name TEXT NOT NULL,
    site_key TEXT,
    metric_key TEXT NOT NULL,
    metric_value REAL NOT NULL,
    action_type TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT NOT NULL,
    details_json TEXT NOT NULL,
    triggered_at TEXT NOT NULL
  );
`);

const state = {
  requests: [],
  sparkData: Array.from({ length: historyLimit }, (_, index) => ({
    tick: index,
    rps: 0,
    latency: 0,
    errors: 0,
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
  })),
  totals: {
    total: 0,
    errors: 0,
  },
  rateLimitEvents: [],
  auditTrail: [],
  sites: [DEFAULT_SITE],
  edgePolicies: {},
  runtimeConfig: {},
  automationRules: [],
  chaosUntil: 0,
  scenario: "normal",
  scenarioUntil: 0,
  bucket: {
    reqs: 0,
    latSum: 0,
    errs: 0,
    byStatus: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 },
  },
  deliveryLog: [],
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hashPassword(value) {
  return require("crypto").createHash("sha256").update(String(value || "")).digest("hex");
}

function generateToken(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

function generateApiKey() {
  return `pk_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2, 10)}`;
}

function syncSitesFromDb() {
  const rows = db.prepare("SELECT site_key, name, domain, status, created_at, api_key, owner_email FROM sites ORDER BY created_at DESC").all();
  state.sites = rows.length
    ? rows.map((row) => ({
        siteKey: row.site_key,
        name: row.name,
        domain: row.domain,
        status: row.status,
        createdAt: row.created_at,
        apiKey: row.api_key,
        ownerEmail: row.owner_email,
      }))
    : [DEFAULT_SITE];
}

function syncEdgePoliciesFromDb() {
  const rows = db.prepare("SELECT * FROM edge_policies").all();
  state.edgePolicies = rows.reduce((accumulator, row) => {
    accumulator[row.site_key] = {
      siteKey: row.site_key,
      securityMode: row.security_mode,
      wafMode: row.waf_mode,
      rateLimitMode: row.rate_limit_mode,
      botFightMode: row.bot_fight_mode,
      cacheMode: row.cache_mode,
      underAttack: Boolean(row.under_attack),
      updatedAt: row.updated_at,
    };
    return accumulator;
  }, {});
}

function syncRuntimeConfigFromDb() {
  const rows = db.prepare("SELECT * FROM site_runtime_config").all();
  state.runtimeConfig = rows.reduce((accumulator, row) => {
    accumulator[row.site_key] = {
      siteKey: row.site_key,
      trafficMode: row.traffic_mode,
      sampleRate: Number(row.sample_rate || 100),
      ingestLogs: Boolean(row.ingest_logs),
      allowDemo: Boolean(row.allow_demo),
      updatedAt: row.updated_at,
    };
    return accumulator;
  }, {});
}

function syncAutomationRulesFromDb() {
  const rows = db.prepare("SELECT * FROM automation_rules ORDER BY created_at DESC, id DESC").all();
  state.automationRules = rows.map((row) => ({
    id: Number(row.id),
    siteKey: row.site_key || "",
    name: row.name,
    metricKey: row.metric_key,
    comparator: row.comparator,
    thresholdValue: Number(row.threshold_value || 0),
    actionType: row.action_type,
    actionConfig: (() => {
      try {
        return JSON.parse(row.action_config_json || "{}");
      } catch {
        return {};
      }
    })(),
    cooldownSeconds: Number(row.cooldown_seconds || 300),
    enabled: Boolean(row.enabled),
    lastTriggeredAt: row.last_triggered_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function ensureRuntimeConfig(siteKey) {
  const existing = db.prepare("SELECT site_key FROM site_runtime_config WHERE site_key = ?").get(siteKey);
  if (!existing) {
    db.prepare(
      "INSERT INTO site_runtime_config (site_key, traffic_mode, sample_rate, ingest_logs, allow_demo, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(siteKey, "auto", 100, 1, 1, new Date().toISOString());
  }
  syncRuntimeConfigFromDb();
  return state.runtimeConfig[siteKey] || {
    siteKey,
    trafficMode: "auto",
    sampleRate: 100,
    ingestLogs: true,
    allowDemo: true,
    updatedAt: new Date().toISOString(),
  };
}

function getRuntimeConfig(siteKey) {
  return state.runtimeConfig[siteKey] || ensureRuntimeConfig(siteKey);
}

function updateRuntimeConfig(siteKey, input = {}) {
  const current = getRuntimeConfig(siteKey);
  const next = {
    trafficMode: ["auto", "live_only", "demo_only"].includes(input.trafficMode) ? input.trafficMode : current.trafficMode,
    sampleRate: Math.max(1, Math.min(100, Number(input.sampleRate ?? current.sampleRate) || current.sampleRate)),
    ingestLogs: typeof input.ingestLogs === "boolean" ? input.ingestLogs : current.ingestLogs,
    allowDemo: typeof input.allowDemo === "boolean" ? input.allowDemo : current.allowDemo,
  };
  const updatedAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO site_runtime_config (site_key, traffic_mode, sample_rate, ingest_logs, allow_demo, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(site_key) DO UPDATE SET traffic_mode = excluded.traffic_mode, sample_rate = excluded.sample_rate, ingest_logs = excluded.ingest_logs, allow_demo = excluded.allow_demo, updated_at = excluded.updated_at",
  ).run(siteKey, next.trafficMode, next.sampleRate, next.ingestLogs ? 1 : 0, next.allowDemo ? 1 : 0, updatedAt);
  syncRuntimeConfigFromDb();
  return state.runtimeConfig[siteKey];
}

function ensureEdgePolicy(siteKey) {
  const existing = db.prepare("SELECT site_key FROM edge_policies WHERE site_key = ?").get(siteKey);
  if (!existing) {
    db.prepare(
      "INSERT INTO edge_policies (site_key, security_mode, waf_mode, rate_limit_mode, bot_fight_mode, cache_mode, under_attack, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      siteKey,
      DEFAULT_EDGE_POLICY.securityMode,
      DEFAULT_EDGE_POLICY.wafMode,
      DEFAULT_EDGE_POLICY.rateLimitMode,
      DEFAULT_EDGE_POLICY.botFightMode,
      DEFAULT_EDGE_POLICY.cacheMode,
      DEFAULT_EDGE_POLICY.underAttack ? 1 : 0,
      new Date().toISOString(),
    );
  }
  syncEdgePoliciesFromDb();
  return state.edgePolicies[siteKey] || { siteKey, ...DEFAULT_EDGE_POLICY, updatedAt: new Date().toISOString() };
}

function getEdgePolicy(siteKey) {
  return state.edgePolicies[siteKey] || ensureEdgePolicy(siteKey);
}

function updateEdgePolicy(siteKey, input = {}) {
  const current = getEdgePolicy(siteKey);
  const next = {
    securityMode: ["relaxed", "balanced", "strict"].includes(input.securityMode) ? input.securityMode : current.securityMode,
    wafMode: ["off", "simulate", "block"].includes(input.wafMode) ? input.wafMode : current.wafMode,
    rateLimitMode: ["basic", "adaptive", "aggressive"].includes(input.rateLimitMode) ? input.rateLimitMode : current.rateLimitMode,
    botFightMode: ["observe", "managed", "super"].includes(input.botFightMode) ? input.botFightMode : current.botFightMode,
    cacheMode: ["off", "smart", "cache-everything"].includes(input.cacheMode) ? input.cacheMode : current.cacheMode,
    underAttack: typeof input.underAttack === "boolean" ? input.underAttack : current.underAttack,
  };
  const updatedAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO edge_policies (site_key, security_mode, waf_mode, rate_limit_mode, bot_fight_mode, cache_mode, under_attack, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(site_key) DO UPDATE SET security_mode = excluded.security_mode, waf_mode = excluded.waf_mode, rate_limit_mode = excluded.rate_limit_mode, bot_fight_mode = excluded.bot_fight_mode, cache_mode = excluded.cache_mode, under_attack = excluded.under_attack, updated_at = excluded.updated_at",
  ).run(siteKey, next.securityMode, next.wafMode, next.rateLimitMode, next.botFightMode, next.cacheMode, next.underAttack ? 1 : 0, updatedAt);
  syncEdgePoliciesFromDb();
  return state.edgePolicies[siteKey];
}

function buildDefaultAutomationRuleSet() {
  const siteKey = state.sites[0]?.siteKey || DEFAULT_SITE.siteKey;
  const now = new Date().toISOString();
  return [
    {
      siteKey,
      name: "Protect elevated site risk",
      metricKey: "site_risk_score",
      comparator: "gte",
      thresholdValue: 65,
      actionType: "edge_lockdown",
      actionConfig: {
        securityMode: "strict",
        wafMode: "block",
        rateLimitMode: "aggressive",
        botFightMode: "super",
        underAttack: true,
      },
      cooldownSeconds: 300,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      siteKey: "",
      name: "Broadcast major incident posture",
      metricKey: "global_threat_score",
      comparator: "gte",
      thresholdValue: 45,
      actionType: "notify_webhook",
      actionConfig: {
        severity: "critical",
        note: "Automation detected an elevated global threat posture.",
      },
      cooldownSeconds: 240,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createAutomationRule(input = {}) {
  const now = new Date().toISOString();
  const siteKey = input.siteKey && state.sites.some((site) => site.siteKey === input.siteKey) ? input.siteKey : null;
  const name = String(input.name || "").trim() || "Untitled automation";
  const metricKey = [
    "global_threat_score",
    "global_error_rate",
    "global_latency",
    "site_risk_score",
    "site_error_rate",
    "site_blocked_requests",
    "site_bot_requests",
  ].includes(input.metricKey)
    ? input.metricKey
    : "site_risk_score";
  const comparator = ["gte", "lte"].includes(input.comparator) ? input.comparator : "gte";
  const thresholdValue = Number(input.thresholdValue ?? 0);
  const actionType = ["notify_webhook", "edge_lockdown", "generate_playbook", "share_report"].includes(input.actionType)
    ? input.actionType
    : "notify_webhook";
  const actionConfig = input.actionConfig && typeof input.actionConfig === "object" ? input.actionConfig : {};
  const cooldownSeconds = Math.max(60, Math.min(3600, Number(input.cooldownSeconds ?? 300) || 300));
  const enabled = typeof input.enabled === "boolean" ? input.enabled : true;

  const result = db.prepare(
    "INSERT INTO automation_rules (site_key, name, metric_key, comparator, threshold_value, action_type, action_config_json, cooldown_seconds, enabled, last_triggered_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(siteKey, name, metricKey, comparator, thresholdValue, actionType, JSON.stringify(actionConfig), cooldownSeconds, enabled ? 1 : 0, null, now, now);
  syncAutomationRulesFromDb();
  return state.automationRules.find((rule) => rule.id === Number(result.lastInsertRowid));
}

function updateAutomationRule(ruleId, input = {}) {
  const current = state.automationRules.find((rule) => rule.id === Number(ruleId));
  if (!current) return null;

  const next = {
    siteKey: typeof input.siteKey === "string"
      ? (input.siteKey && state.sites.some((site) => site.siteKey === input.siteKey) ? input.siteKey : "")
      : current.siteKey,
    name: typeof input.name === "string" && input.name.trim() ? input.name.trim() : current.name,
    metricKey: typeof input.metricKey === "string" ? input.metricKey : current.metricKey,
    comparator: typeof input.comparator === "string" ? input.comparator : current.comparator,
    thresholdValue: input.thresholdValue !== undefined ? Number(input.thresholdValue) : current.thresholdValue,
    actionType: typeof input.actionType === "string" ? input.actionType : current.actionType,
    actionConfig: input.actionConfig && typeof input.actionConfig === "object" ? input.actionConfig : current.actionConfig,
    cooldownSeconds: input.cooldownSeconds !== undefined ? Math.max(60, Math.min(3600, Number(input.cooldownSeconds) || current.cooldownSeconds)) : current.cooldownSeconds,
    enabled: typeof input.enabled === "boolean" ? input.enabled : current.enabled,
    lastTriggeredAt: input.lastTriggeredAt !== undefined ? input.lastTriggeredAt : current.lastTriggeredAt,
    updatedAt: new Date().toISOString(),
  };

  db.prepare(
    "UPDATE automation_rules SET site_key = ?, name = ?, metric_key = ?, comparator = ?, threshold_value = ?, action_type = ?, action_config_json = ?, cooldown_seconds = ?, enabled = ?, last_triggered_at = ?, updated_at = ? WHERE id = ?",
  ).run(
    next.siteKey || null,
    next.name,
    next.metricKey,
    next.comparator,
    next.thresholdValue,
    next.actionType,
    JSON.stringify(next.actionConfig || {}),
    next.cooldownSeconds,
    next.enabled ? 1 : 0,
    next.lastTriggeredAt,
    next.updatedAt,
    current.id,
  );

  syncAutomationRulesFromDb();
  return state.automationRules.find((rule) => rule.id === current.id) || null;
}

function listAutomationRuns(limit = 30) {
  return db.prepare("SELECT * FROM automation_runs ORDER BY triggered_at DESC, id DESC LIMIT ?").all(limit).map((row) => ({
    id: Number(row.id),
    ruleId: Number(row.rule_id),
    ruleName: row.rule_name,
    siteKey: row.site_key || "",
    metricKey: row.metric_key,
    metricValue: Number(row.metric_value || 0),
    actionType: row.action_type,
    status: row.status,
    summary: row.summary,
    details: (() => {
      try {
        return JSON.parse(row.details_json || "{}");
      } catch {
        return {};
      }
    })(),
    triggeredAt: row.triggered_at,
  }));
}

function recordAutomationRun(rule, payload) {
  const triggeredAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO automation_runs (rule_id, rule_name, site_key, metric_key, metric_value, action_type, status, summary, details_json, triggered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    rule.id,
    rule.name,
    payload.siteKey || null,
    rule.metricKey,
    Number(payload.metricValue || 0),
    rule.actionType,
    payload.status || "success",
    payload.summary || "Automation executed",
    JSON.stringify(payload.details || {}),
    triggeredAt,
  );
  db.prepare("DELETE FROM automation_runs WHERE id NOT IN (SELECT id FROM automation_runs ORDER BY triggered_at DESC, id DESC LIMIT 200)").run();
  return triggeredAt;
}

function evaluateComparator(left, comparator, right) {
  if (comparator === "lte") return left <= right;
  return left >= right;
}

function resolveAutomationTargetSite(rule, snapshot) {
  if (rule.siteKey) {
    return state.sites.find((site) => site.siteKey === rule.siteKey) || null;
  }
  const busiest = snapshot.siteRows[0];
  if (busiest?.siteKey) {
    return state.sites.find((site) => site.siteKey === busiest.siteKey) || null;
  }
  return state.sites[0] || DEFAULT_SITE;
}

function resolveAutomationMetric(rule, snapshot) {
  const targetSite = resolveAutomationTargetSite(rule, snapshot);
  const siteRow = targetSite ? snapshot.siteRows.find((row) => row.siteKey === targetSite.siteKey) : null;

  switch (rule.metricKey) {
    case "global_threat_score":
      return { value: snapshot.threatScore || 0, label: "Global threat score", site: null };
    case "global_error_rate":
      return { value: snapshot.totals.errorRate || 0, label: "Global error rate", site: null };
    case "global_latency":
      return { value: snapshot.totals.avgLatency || 0, label: "Global average latency", site: null };
    case "site_error_rate":
      return { value: siteRow?.errorRate || 0, label: "Site error rate", site: targetSite };
    case "site_blocked_requests":
      return { value: siteRow?.blocked || 0, label: "Site blocked requests", site: targetSite };
    case "site_bot_requests":
      return { value: siteRow?.bots || 0, label: "Site bot requests", site: targetSite };
    case "site_risk_score":
    default:
      return { value: siteRow?.riskScore || 0, label: "Site risk score", site: targetSite };
  }
}

function executeAutomationAction(rule, context) {
  const site = context.site;
  const valueText = `${context.metric.label}=${Number(context.metric.value || 0)}`;

  if (rule.actionType === "notify_webhook") {
    triggerWebhookDeliveries(site?.siteKey || null, {
      source: "automation",
      rule: rule.name,
      metricKey: rule.metricKey,
      metricValue: context.metric.value,
      note: rule.actionConfig?.note || `${rule.name} triggered`,
    });
    return {
      status: "success",
      summary: `Webhook automation delivered for ${rule.name}`,
      details: { siteKey: site?.siteKey || "", note: rule.actionConfig?.note || "", metric: valueText },
    };
  }

  if (rule.actionType === "edge_lockdown") {
    if (!site?.siteKey) {
      return {
        status: "skipped",
        summary: `Edge lockdown skipped for ${rule.name}`,
        details: { reason: "No eligible site found" },
      };
    }
    const policy = updateEdgePolicy(site.siteKey, {
      securityMode: "strict",
      wafMode: "block",
      rateLimitMode: "aggressive",
      botFightMode: "super",
      underAttack: true,
      ...(rule.actionConfig || {}),
    });
    return {
      status: "success",
      summary: `Edge lockdown applied to ${site.name}`,
      details: { siteKey: site.siteKey, policy },
    };
  }

  if (rule.actionType === "generate_playbook") {
    const overview = buildSiteOverview(site?.siteKey || DEFAULT_SITE.siteKey);
    triggerWebhookDeliveries(overview.site.siteKey, {
      source: "automation",
      rule: rule.name,
      playbook: overview.playbook,
    });
    return {
      status: "success",
      summary: `Playbook generated for ${overview.site.name}`,
      details: { siteKey: overview.site.siteKey, summary: overview.playbook.summary },
    };
  }

  if (rule.actionType === "share_report") {
    const snapshot = context.snapshot || buildSnapshot();
    const report = buildIncidentReport(snapshot);
    const id = `share_${Math.random().toString(36).slice(2, 10)}`;
    db.prepare("INSERT INTO shared_reports (id, title, payload_json, created_at) VALUES (?, ?, ?, ?)").run(
      id,
      report.title,
      JSON.stringify({ report, snapshot }),
      new Date().toISOString(),
    );
    return {
      status: "success",
      summary: `Incident report shared as ${id}`,
      details: { reportId: id, title: report.title },
    };
  }

  return {
    status: "skipped",
    summary: `No action handler for ${rule.actionType}`,
    details: { actionType: rule.actionType },
  };
}

function evaluateAutomationRules(snapshot, options = {}) {
  const now = Date.now();
  const triggered = [];

  state.automationRules
    .filter((rule) => rule.enabled)
    .forEach((rule) => {
      const metric = resolveAutomationMetric(rule, snapshot);
      const breached = evaluateComparator(Number(metric.value || 0), rule.comparator, Number(rule.thresholdValue || 0));
      if (!breached) return;

      const lastTriggeredTs = rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).getTime() : 0;
      const cooldownMs = Math.max(60, Number(rule.cooldownSeconds || 300)) * 1000;
      if (!options.manual && lastTriggeredTs && now - lastTriggeredTs < cooldownMs) return;

      const site = metric.site;
      const actionResult = executeAutomationAction(rule, { metric, site, snapshot });
      const summary = `${rule.name} fired because ${metric.label.toLowerCase()} hit ${Number(metric.value || 0)}.`;
      const triggeredAt = recordAutomationRun(rule, {
        siteKey: site?.siteKey || "",
        metricValue: metric.value,
        status: actionResult.status,
        summary,
        details: actionResult.details,
      });
      updateAutomationRule(rule.id, { lastTriggeredAt: triggeredAt });
      logAudit("automation.triggered", `${rule.name} -> ${actionResult.summary}`);
      triggered.push({
        ruleId: rule.id,
        ruleName: rule.name,
        siteKey: site?.siteKey || "",
        metricKey: rule.metricKey,
        metricValue: Number(metric.value || 0),
        actionType: rule.actionType,
        status: actionResult.status,
        summary,
        actionSummary: actionResult.summary,
        triggeredAt,
      });
    });

  return triggered;
}

function ensureSeedData() {
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (!userCount) {
    db.prepare(
      "INSERT INTO users (name, email, organization, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("Demo Operator", "demo@pulseops.ai", "Capstone Control Room", "Incident Commander", hashPassword("pulseops-demo"), new Date().toISOString());
  }

  const siteCount = db.prepare("SELECT COUNT(*) AS count FROM sites").get().count;
  if (!siteCount) {
    db.prepare(
      "INSERT INTO sites (site_key, name, domain, status, created_at, api_key, owner_email) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(DEFAULT_SITE.siteKey, DEFAULT_SITE.name, DEFAULT_SITE.domain, DEFAULT_SITE.status, DEFAULT_SITE.createdAt, generateApiKey(), "demo@pulseops.ai");
  }

  syncSitesFromDb();
  state.sites.forEach((site) => ensureEdgePolicy(site.siteKey));
  state.sites.forEach((site) => ensureRuntimeConfig(site.siteKey));
  syncAutomationRulesFromDb();
  if (!state.automationRules.length) {
    buildDefaultAutomationRuleSet().forEach((rule) => createAutomationRule(rule));
  }
}

function pick(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function createSite(name, domain) {
  const normalizedDomain = normalizeDomain(domain);
  const apiKey = generateApiKey();
  const site = {
    siteKey: `site_${slugify(name || normalizedDomain || "pulseops")}_${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || normalizedDomain || "Untitled Site").trim(),
    domain: normalizedDomain || "unknown.local",
    createdAt: new Date().toISOString(),
    status: "active",
    apiKey,
  };
  db.prepare(
    "INSERT OR REPLACE INTO sites (site_key, name, domain, status, created_at, api_key, owner_email) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(site.siteKey, site.name, site.domain, site.status, site.createdAt, site.apiKey, null);
  syncSitesFromDb();
  ensureEdgePolicy(site.siteKey);
  ensureRuntimeConfig(site.siteKey);
  return site;
}

function getBaseUrl(req) {
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL;
  return `${req.protocol}://${req.get("host")}`;
}

function buildSiteSnippet(site, baseUrl) {
  return `<!-- PulseOps website monitor -->\n<script src="${baseUrl}/sdk/pulseops.js"></script>\n<script>\n  window.PulseOps.init({\n    siteKey: "${site.siteKey}",\n    apiKey: "${site.apiKey}",\n    collectorUrl: "${baseUrl}/api/collect"\n  });\n  window.PulseOps.trackPageView();\n</script>`;
}

ensureSeedData();

function detectThreatSignals({ endpoint, userAgent, status, ip, blocked }) {
  const safeEndpoint = String(endpoint || "");
  const safeAgent = String(userAgent || "");
  const warnings = [];
  const bot = KNOWN_BOT_PATTERNS.some((pattern) => pattern.test(safeAgent));
  const maliciousAgent = MALICIOUS_PATTERNS.some((pattern) => pattern.test(safeAgent));
  const illegalPath = ILLEGAL_PATH_PATTERNS.some((pattern) => pattern.test(safeEndpoint));
  const bruteSignal = /(login|auth|signin)/i.test(safeEndpoint) && [401, 403, 429].includes(Number(status || 0));
  const internalProbe = /^10\.|^172\.(1[6-9]|2\d|3[0-1])\.|^192\.168\./.test(String(ip || ""));

  if (illegalPath) warnings.push("Sensitive-path probing detected");
  if (bruteSignal) warnings.push("Authentication abuse pattern detected");
  if (maliciousAgent) warnings.push("Known malicious automation signature detected");
  if (bot && !maliciousAgent) warnings.push("Automated crawler traffic detected");
  if (blocked) warnings.push("Traffic was actively rate-limited");
  if (internalProbe && illegalPath) warnings.push("Potential internal reconnaissance pattern");

  return {
    bot,
    malicious: maliciousAgent || illegalPath || bruteSignal,
    illegalAttempt: illegalPath || bruteSignal,
    warnings,
  };
}

function classifyTrust({ bot, malicious, illegalAttempt, blocked, status }) {
  if (illegalAttempt || malicious) return "malicious";
  if (blocked || Number(status || 0) === 429) return "suspicious";
  if (bot) return "unknown";
  return "trusted";
}

function buildCountDistribution(items, keyBuilder) {
  const counts = items.reduce((accumulator, item) => {
    const key = keyBuilder(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);
}

function buildRiskScore(requests) {
  if (!requests.length) return 8;
  const botCount = requests.filter((request) => request.bot).length;
  const maliciousCount = requests.filter((request) => request.malicious).length;
  const blockedCount = requests.filter((request) => request.blocked).length;
  const illegalCount = requests.filter((request) => request.illegalAttempt).length;
  const errorCount = requests.filter((request) => request.status >= 400).length;

  return Math.min(
    100,
    Math.round(
      botCount * 1.4 +
      maliciousCount * 9 +
      blockedCount * 4 +
      illegalCount * 10 +
      (errorCount / Math.max(1, requests.length)) * 100,
    ),
  );
}

function pickWeightedAgent() {
  const totalWeight = agents.reduce((sum, agent) => sum + agent.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const agent of agents) {
    cursor -= agent.weight;
    if (cursor <= 0) {
      return agent;
    }
  }

  return agents[0];
}

function classifyStatus(code) {
  if (code < 300) return "2xx";
  if (code < 400) return "3xx";
  if (code < 500) return "4xx";
  return "5xx";
}

function buildEndpointRows(requests) {
  const table = {};

  requests.forEach((request) => {
    if (!table[request.endpoint]) {
      table[request.endpoint] = { count: 0, latSum: 0, errors: 0, latencies: [] };
    }

    table[request.endpoint].count += 1;
    table[request.endpoint].latSum += request.latency;
    table[request.endpoint].latencies.push(request.latency);
    if (request.status >= 500) table[request.endpoint].errors += 1;
  });

  return Object.entries(table)
    .map(([name, value]) => {
      const samples = [...value.latencies].sort((left, right) => left - right);
      const p95 = samples[Math.max(0, Math.floor(samples.length * 0.95) - 1)] || 0;
      const errorPct = value.count ? (value.errors / value.count) * 100 : 0;

      return {
        name,
        count: value.count,
        avgLatency: Math.round(value.latSum / value.count),
        p95,
        errorPct: Number(errorPct.toFixed(1)),
      };
    })
    .sort((left, right) => right.count - left.count);
}

function buildDistribution(requests, keyBuilder) {
  const counts = requests.reduce((accumulator, request) => {
    const key = keyBuilder(request);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function getScenarioState() {
  const scenarioKey = Date.now() < state.scenarioUntil ? state.scenario : "normal";
  return SCENARIOS[scenarioKey] || SCENARIOS.normal;
}

function shouldGenerateBackgroundDemo(site, runtimeConfig) {
  if (!site || !runtimeConfig) return false;
  if (!runtimeConfig.allowDemo) return false;
  if (runtimeConfig.trafficMode === "live_only") return false;
  if (runtimeConfig.trafficMode === "demo_only") return true;

  const recentRealTraffic = state.requests.some(
    (request) =>
      request.siteKey === site.siteKey &&
      request.sourceType !== "simulated_demo" &&
      Date.now() - request.ts < 15000,
  );

  return !recentRealTraffic;
}

function generateSimulatedDemoRequest(site, endpoint, method = "GET") {
  const profile = scenarioMap[endpoint] || { okMin: 30, okMax: 220, failMin: 400, failMax: 1200 };
  const agent = pickWeightedAgent();
  const scenario = getScenarioState();
  const chaosFactor = Date.now() < state.chaosUntil ? 2.4 : 1;
  const botFactor = agent.bot ? scenario.botMultiplier : 1;
  const focusBoost = scenario.focus === endpoint ? 1.7 : 1;
  const blocked = agent.malicious && Math.random() < 0.24 * chaosFactor * scenario.botMultiplier;
  const failing = Math.random() < 0.14 * chaosFactor * scenario.errorMultiplier * focusBoost;
  const status = failing
    ? pick([400, 401, 403, 404, 429, 500, 502])
    : pick([200, 200, 200, 200, 201, 204]);
  const finalStatus = blocked ? 429 : status;
  const latencyBase = status >= 500
    ? randomBetween(profile.failMin, profile.failMax)
    : status >= 400
      ? randomBetween(Math.round(profile.okMax * 0.8), profile.failMin)
      : randomBetween(profile.okMin, profile.okMax);
  const latency = Math.round(latencyBase * scenario.latencyMultiplier * focusBoost * botFactor);
  const payloadBytes = randomBetween(250, 9000);
  const region = pick(regionPool);
  const threatSignals = detectThreatSignals({
    endpoint,
    userAgent: agent.name,
    status: finalStatus,
    ip: "",
    blocked,
  });

  const requestRecord = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    method,
    endpoint,
    status: finalStatus,
    latency,
    bytes: payloadBytes,
    region,
    trace: `trc_${Math.random().toString(36).slice(2, 10)}`,
    agentName: agent.name,
    bot: agent.bot || threatSignals.bot,
    malicious: agent.malicious || threatSignals.malicious,
    blocked,
    illegalAttempt: threatSignals.illegalAttempt,
    warnings: threatSignals.warnings,
    siteKey: site.siteKey,
    siteName: site.name,
    siteDomain: site.domain,
    country: COUNTRY_BY_REGION[region] || "United States",
    asn: pick(ASN_POOL),
    sourceType: "simulated_demo",
    trustLevel: classifyTrust({
      bot: agent.bot || threatSignals.bot,
      malicious: agent.malicious || threatSignals.malicious,
      illegalAttempt: threatSignals.illegalAttempt,
      blocked,
      status: finalStatus,
    }),
  };

  recordRequest(requestRecord);

  if (blocked) {
    state.rateLimitEvents = [
      {
        id: crypto.randomUUID(),
        ts: requestRecord.ts,
        agentName: agent.name,
        endpoint,
        status: finalStatus,
        action: "rate-limited",
        siteName: site.name,
      },
      ...state.rateLimitEvents,
    ].slice(0, 24);
  }

  if (requestRecord.illegalAttempt || requestRecord.malicious) {
    logAudit("security.warning", `${site.name}: ${requestRecord.agentName} on ${endpoint}`);
  }

  return {
    requestRecord,
    responseBody: {
      ok: finalStatus < 400,
      path: endpoint,
      method,
      latency,
      trace: requestRecord.trace,
      region: requestRecord.region,
      agent: agent.name,
      bot: agent.bot,
    },
  };
}

function buildRegionDistribution(requests) {
  return Object.entries(
    requests.reduce((accumulator, request) => {
      accumulator[request.region] = (accumulator[request.region] || 0) + 1;
      return accumulator;
    }, {}),
  ).map(([name, value]) => ({ name, value }));
}

function buildSiteRows(requests) {
  const grouped = requests.reduce((accumulator, request) => {
    const key = request.siteKey || DEFAULT_SITE.siteKey;
    const meta = state.sites.find((site) => site.siteKey === key) || DEFAULT_SITE;
    if (!accumulator[key]) {
      accumulator[key] = {
        siteKey: key,
        name: request.siteName || meta.name,
        domain: request.siteDomain || meta.domain,
        requests: 0,
        errors: 0,
        bots: 0,
        blocked: 0,
        warnings: 0,
        latSum: 0,
        lastSeen: 0,
      };
    }

    accumulator[key].requests += 1;
    accumulator[key].latSum += request.latency || 0;
    if (request.status >= 400) accumulator[key].errors += 1;
    if (request.bot) accumulator[key].bots += 1;
    if (request.blocked) accumulator[key].blocked += 1;
    if (request.illegalAttempt || request.malicious) accumulator[key].warnings += 1;
    accumulator[key].lastSeen = Math.max(accumulator[key].lastSeen, request.ts || 0);
    return accumulator;
  }, {});

  return Object.values(grouped)
    .map((row) => ({
      ...row,
      avgLatency: row.requests ? Math.round(row.latSum / row.requests) : 0,
      errorRate: row.requests ? Number(((row.errors / row.requests) * 100).toFixed(1)) : 0,
      riskScore: buildRiskScore(requests.filter((request) => request.siteKey === row.siteKey)),
    }))
    .sort((left, right) => right.requests - left.requests);
}

function buildSuspiciousEvents(requests) {
  return requests
    .filter((request) => request.illegalAttempt || request.malicious || request.blocked)
    .slice(0, 10)
    .map((request) => ({
      id: request.id,
      ts: request.ts,
      siteName: request.siteName,
      siteDomain: request.siteDomain,
      endpoint: request.endpoint,
      status: request.status,
      agentName: request.agentName,
      illegalAttempt: request.illegalAttempt,
      warnings: request.warnings || [],
      severity: request.illegalAttempt || request.status >= 500 ? "critical" : request.blocked ? "warning" : "info",
    }));
}

function buildSecurityWarnings(snapshot) {
  const warnings = [];

  if (snapshot.suspiciousEvents.some((event) => event.warnings.includes("Sensitive-path probing detected"))) {
    warnings.push({
      id: "warn-probe",
      severity: "critical",
      title: "Sensitive-path probing detected",
      detail: "A visitor attempted to access routes such as /admin, .env, wp-login, or other high-risk paths.",
    });
  }
  if (snapshot.suspiciousEvents.some((event) => event.warnings.includes("Authentication abuse pattern detected"))) {
    warnings.push({
      id: "warn-auth-abuse",
      severity: "warning",
      title: "Authentication abuse pattern detected",
      detail: "Repeated auth-related failures suggest credential stuffing or brute-force behavior.",
    });
  }
  if (snapshot.threatScore >= 45) {
    warnings.push({
      id: "warn-threat-score",
      severity: "critical",
      title: "Threat score elevated",
      detail: `Threat score is ${snapshot.threatScore}/100 because malicious automation and blocked traffic are increasing.`,
    });
  }
  if (snapshot.siteRows.some((site) => site.bots >= Math.max(6, Math.round(site.requests * 0.35)))) {
    warnings.push({
      id: "warn-bot-ratio",
      severity: "warning",
      title: "Bot traffic ratio high",
      detail: "One or more monitored websites are seeing an unusual share of bot traffic.",
    });
  }

  return warnings.slice(0, 4);
}

function buildAttackPlaybook(requests, site) {
  const riskScore = buildRiskScore(requests);
  const illegalPaths = requests.filter((request) => request.illegalAttempt).length;
  const authAbuse = requests.filter((request) => request.warnings?.includes("Authentication abuse pattern detected")).length;
  const blocked = requests.filter((request) => request.blocked).length;
  const topThreat = requests.find((request) => request.malicious || request.illegalAttempt);

  return {
    siteName: site?.name || "Selected Website",
    severity: riskScore >= 70 ? "critical" : riskScore >= 35 ? "warning" : "info",
    summary:
      riskScore >= 70
        ? "Treat this as an active security incident. Malicious or illegal-looking traffic is materially affecting the monitored site."
        : riskScore >= 35
          ? "Security posture is degraded. Suspicious patterns are accumulating and should be contained before they spread."
          : "No major attack pattern dominates yet, but the site should remain under active observation.",
    actions: [
      illegalPaths ? "Protect admin, config, and hidden routes behind stricter access controls or WAF rules." : "Keep sensitive routes inventoried and monitored.",
      authAbuse ? "Tighten login and auth rate limits, then review failed-auth bursts for credential stuffing." : "Monitor authentication routes for brute-force signatures.",
      blocked ? "Review recently blocked traffic to turn temporary mitigations into durable detection rules." : "Prepare auto-block rules before the next threat spike.",
    ],
    recommendation:
      topThreat
        ? `Most urgent path is ${topThreat.endpoint} from ${topThreat.agentName}.`
        : "No urgent attacker path stands out yet.",
  };
}

function buildWeeklySummary(requests, site) {
  const suspicious = requests.filter((request) => request.malicious || request.illegalAttempt).length;
  const bots = requests.filter((request) => request.bot).length;
  const blocked = requests.filter((request) => request.blocked).length;
  const authAbuse = requests.filter((request) => request.warnings?.includes("Authentication abuse pattern detected")).length;

  return {
    title: `${site?.name || "Website"} weekly security summary`,
    body: `${suspicious} suspicious events, ${bots} bot requests, ${blocked} blocked actions, and ${authAbuse} auth-abuse signals were observed in the current rolling sample.`,
    takeaways: [
      suspicious ? "The site has active hostile behavior worth triaging." : "No dominant hostile pattern is visible yet.",
      bots ? "Bot traffic is meaningful enough to track separately from human sessions." : "Traffic currently looks mostly human.",
      blocked ? "Mitigation controls are firing and should be validated." : "Controls have not had to block much traffic yet.",
    ],
  };
}

function buildTrafficSourceSummary(requests, siteKey) {
  const siteRequests = requests.filter((request) => request.siteKey === siteKey);
  const counts = siteRequests.reduce((accumulator, request) => {
    const key = request.sourceType || "unknown";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
  const liveBrowser = counts.live_browser || 0;
  const importedLogs = counts.ingested_log || 0;
  const simulatedDemo = counts.simulated_demo || 0;
  const lastSeenAt = siteRequests[0]?.ts || null;
  const primarySource = liveBrowser >= Math.max(importedLogs, simulatedDemo)
    ? "live_browser"
    : importedLogs >= simulatedDemo
      ? "ingested_log"
      : "simulated_demo";
  return {
    liveBrowser,
    importedLogs,
    simulatedDemo,
    total: siteRequests.length,
    lastSeenAt,
    primarySource: siteRequests.length ? primarySource : "none",
    recentLiveTraffic: Boolean(lastSeenAt && liveBrowser && Date.now() - lastSeenAt < 5 * 60 * 1000),
  };
}

function buildEdgePosture(site, requests) {
  const policy = getEdgePolicy(site.siteKey);
  const total = Math.max(1, requests.length);
  const suspicious = requests.filter((request) => request.malicious || request.illegalAttempt).length;
  const bots = requests.filter((request) => request.bot).length;
  const blocked = requests.filter((request) => request.blocked).length;
  const authAbuse = requests.filter((request) => request.warnings?.includes("Authentication abuse pattern detected")).length;
  const cacheHitEstimate = Math.max(
    18,
    Math.min(
      96,
      Math.round(
        policy.cacheMode === "cache-everything"
          ? 82 - (suspicious > 0 ? 6 : 0)
          : policy.cacheMode === "smart"
            ? 64 - (authAbuse > 0 ? 4 : 0)
            : 24,
      ),
    ),
  );
  const botScore = Math.min(100, Math.round((bots / total) * 100 + blocked * 5 + suspicious * 4));
  const wafHits = suspicious + authAbuse + Math.round(blocked * 0.7);
  const edgeStatus =
    policy.underAttack || policy.wafMode === "block" || botScore >= 70
      ? "shielding"
      : suspicious || bots
        ? "watching"
        : "stable";

  return {
    policy,
    status: edgeStatus,
    wafHits,
    botScore,
    cacheHitEstimate,
    blockedRequests: blocked,
    edgeRequests: requests.length,
    dnsProxy: "proxied",
    originShield: policy.underAttack || policy.securityMode === "strict" ? "active" : "standby",
    tlsMode: "full-strict",
    recommendations: [
      policy.wafMode === "simulate"
        ? "Move WAF from simulate to block once the current false-positive rate is acceptable."
        : "Review the latest blocked events and promote stable signatures into durable WAF rules.",
      authAbuse
        ? "Tighten auth route rate limiting and challenge repeated failed-login sequences."
        : "Keep adaptive rate limiting on sensitive login and admin paths.",
      cacheHitEstimate < 60
        ? "Increase edge cache coverage for static and anonymous content to reduce origin pressure."
        : "Current cache policy is reducing origin load effectively; keep cache exclusions narrow.",
    ],
  };
}

function buildSiteOverview(siteKey) {
  const site = state.sites.find((item) => item.siteKey === siteKey) || DEFAULT_SITE;
  const requests = state.requests.filter((request) => request.siteKey === site.siteKey);
  const runtimeConfig = getRuntimeConfig(site.siteKey);
  const trafficSources = buildTrafficSourceSummary(state.requests, site.siteKey);
  const suspiciousEvents = buildSuspiciousEvents(requests);
  const abuseTimeline = suspiciousEvents.map((event) => ({
    id: event.id,
    ts: event.ts,
    title: `${event.agentName} hit ${event.endpoint}`,
    detail: event.warnings.join(", ") || "Suspicious traffic observed",
    severity: event.severity,
  }));
  const sessionReplay = suspiciousEvents.slice(0, 1).map((event) => ({
    actor: event.agentName,
    path: ["/", "/login", event.endpoint, "/blocked"].filter((value, index, array) => array.indexOf(value) === index),
    reason: event.warnings.join(", ") || "Suspicious sequence",
  }));
  const funnel = {
    human: [
      { stage: "Home", value: requests.filter((request) => !request.bot && request.endpoint === "/").length },
      { stage: "Browse", value: requests.filter((request) => !request.bot && /users|orders|product|metrics/i.test(request.endpoint)).length },
      { stage: "Checkout/Auth", value: requests.filter((request) => !request.bot && /orders|auth|login/i.test(request.endpoint)).length },
    ],
    bot: [
      { stage: "Crawl", value: requests.filter((request) => request.bot && !request.malicious).length },
      { stage: "Probe", value: requests.filter((request) => request.illegalAttempt).length },
      { stage: "Blocked", value: requests.filter((request) => request.blocked).length },
    ],
  };
  const threatByCountry = buildCountDistribution(requests, (request) => request.country || "Unknown");
  const threatByAsn = buildCountDistribution(requests, (request) => request.asn || "Unknown Network");
  const trustDistribution = buildCountDistribution(requests, (request) => request.trustLevel || "trusted");
  const socInbox = suspiciousEvents.slice(0, 5).map((event, index) => ({
    id: `soc-${event.id}`,
    title: event.warnings[0] || "Suspicious activity",
    siteName: event.siteName || site.name,
    state: index === 0 ? "investigating" : index === 1 ? "open" : "triaged",
    owner: index === 0 ? "Security Analyst" : index === 1 ? "SOC Lead" : "Automation",
    severity: event.severity,
  }));
  const huntCatalog = [
    "failed login attacks",
    "admin probes",
    "malicious bots",
    "blocked traffic",
    "suspicious auth routes",
  ];
  const playbook = buildAttackPlaybook(requests, site);
  const weeklySummary = buildWeeklySummary(requests, site);
  const riskScore = buildRiskScore(requests);
  const edgePosture = buildEdgePosture(site, requests);

  return {
    site,
    runtimeConfig,
    trafficSources,
    requests,
    riskScore,
    suspiciousEvents,
    abuseTimeline,
    sessionReplay,
    funnel,
    threatByCountry,
    threatByAsn,
    trustDistribution,
    socInbox,
    playbook,
    weeklySummary,
    edgePosture,
    alertSnapshot: {
      title: `${site.name} alert snapshot`,
      summary: playbook.summary,
      threatLevel: riskScore >= 70 ? "High" : riskScore >= 35 ? "Elevated" : "Low",
      suspiciousCount: suspiciousEvents.length,
    },
    onboarding: [
      "Register the website",
      "Copy the collector snippet",
      "Confirm telemetry is arriving",
      "Run an illegal probe simulation",
      "Review risk score and playbook",
    ],
    huntCatalog,
  };
}

function searchThreats(siteKey, query) {
  const overview = buildSiteOverview(siteKey);
  const prompt = String(query || "").toLowerCase();
  let matched = overview.suspiciousEvents;

  if (prompt.includes("admin")) {
    matched = matched.filter((event) => /admin|wp|config/i.test(event.endpoint));
  } else if (prompt.includes("login") || prompt.includes("auth")) {
    matched = matched.filter((event) => event.warnings.some((warning) => /auth/i.test(warning)) || /login|auth/i.test(event.endpoint));
  } else if (prompt.includes("bot")) {
    matched = matched.filter((event) => /bot|crawler/i.test(event.agentName));
  } else if (prompt.includes("blocked")) {
    matched = matched.filter((event) => event.warnings.some((warning) => /rate-limited/i.test(warning)));
  }

  return {
    title: `Threat hunt for "${query}"`,
    body: matched.length
      ? `${matched.length} matching suspicious events found for ${overview.site.name}.`
      : `No matching suspicious events found for ${overview.site.name}.`,
    rows: matched.slice(0, 8),
  };
}

function buildServiceHealth(snapshot) {
  const noisy = snapshot.noisyEndpoint;
  return [
    {
      name: "API Gateway",
      status: snapshot.totals.errorRate >= 5 ? "degraded" : "healthy",
      detail: `${snapshot.totals.currentRps} req/s flowing through the gateway`,
    },
    {
      name: "Auth Service",
      status: noisy?.name === "/api/auth" && noisy.errorPct >= 6 ? "degraded" : "healthy",
      detail: noisy?.name === "/api/auth" ? `${noisy.errorPct}% error rate on auth path` : "Authentication path operating normally",
    },
    {
      name: "Orders API",
      status: snapshot.topEndpoint?.name === "/api/orders" && snapshot.totals.avgLatency >= 400 ? "warning" : "healthy",
      detail: snapshot.topEndpoint?.name === "/api/orders" ? `${snapshot.topEndpoint.avgLatency}ms avg latency` : "Orders latency within expected band",
    },
    {
      name: "Threat Shield",
      status: snapshot.rateLimitEvents.length ? "active" : "monitoring",
      detail: snapshot.rateLimitEvents.length ? `${snapshot.rateLimitEvents.length} recent rate-limit events` : "No active bot blocks in the latest window",
    },
    {
      name: "Website Collector",
      status: snapshot.siteRows?.length ? "active" : "monitoring",
      detail: snapshot.siteRows?.length ? `${snapshot.siteRows.length} monitored sites sending telemetry` : "Waiting for external website telemetry",
    },
    {
      name: "AI Copilot",
      status: OPENAI_API_KEY ? "connected" : "fallback",
      detail: OPENAI_API_KEY ? `Using ${OPENAI_MODEL}` : "Using telemetry-backed fallback reasoning",
    },
  ];
}

function buildTimeline(snapshot) {
  const events = [];
  const now = Date.now();

  if (snapshot.totals.errorRate >= 5) {
    events.push({ id: `err-${now}`, ts: now, label: "5xx threshold crossed", tone: "danger" });
  }
  if (snapshot.totals.avgLatency >= 450) {
    events.push({ id: `lat-${now}`, ts: now - 8000, label: "Latency regression detected", tone: "warning" });
  }
  if (snapshot.noisyEndpoint?.name) {
    events.push({ id: `hot-${now}`, ts: now - 15000, label: `Hot endpoint: ${snapshot.noisyEndpoint.name}`, tone: "info" });
  }
  snapshot.rateLimitEvents.slice(0, 3).forEach((event) => {
    events.push({
      id: event.id,
      ts: event.ts,
      label: `${event.agentName} was rate-limited on ${event.endpoint}`,
      tone: "warning",
    });
  });

  return events.sort((left, right) => right.ts - left.ts).slice(0, 6);
}

function buildSla(snapshot) {
  const availability = Math.max(95, Number((100 - snapshot.totals.errorRate * 0.55).toFixed(2)));
  const latencyBudgetUsed = Math.min(100, Math.max(0, Math.round((snapshot.totals.avgLatency / 450) * 100)));
  return {
    availability,
    latencyBudgetUsed,
    targetAvailability: 99.9,
    targetP95: 450,
  };
}

function logAudit(action, detail) {
  state.auditTrail = [
    {
      id: crypto.randomUUID(),
      ts: Date.now(),
      action,
      detail,
      actor: "demo-operator",
    },
    ...state.auditTrail,
  ].slice(0, 20);
}

function triggerWebhookDeliveries(siteKey, payload) {
  const hooks = db.prepare("SELECT * FROM webhooks WHERE status = ? AND (site_key = ? OR site_key IS NULL)").all("active", siteKey || null);
  const now = new Date().toISOString();

  hooks.forEach((hook) => {
    db.prepare("UPDATE webhooks SET last_delivery_at = ? WHERE id = ?").run(now, hook.id);
    state.deliveryLog = [
      {
        id: `delivery_${hook.id}_${Date.now()}`,
        ts: Date.now(),
        channel: hook.channel,
        target: hook.target,
        siteKey: siteKey || "global",
        payload,
      },
      ...state.deliveryLog,
    ].slice(0, 40);
    logAudit("webhook.delivered", `${hook.channel} -> ${hook.target}`);
  });
}

function buildRootCauses(snapshot) {
  const causes = [];
  if (snapshot.noisyEndpoint) {
    causes.push({
      title: `Endpoint stress on ${snapshot.noisyEndpoint.name}`,
      confidence: Math.min(0.96, 0.42 + snapshot.noisyEndpoint.errorPct / 20),
      evidence: `${snapshot.noisyEndpoint.errorPct}% error concentration with elevated path noise.`,
    });
  }
  if (snapshot.totals.avgLatency >= 400) {
    causes.push({
      title: "Downstream dependency slowdown",
      confidence: Math.min(0.91, 0.38 + snapshot.totals.avgLatency / 2000),
      evidence: `${snapshot.totals.avgLatency}ms rolling latency suggests queueing or dependency contention.`,
    });
  }
  if (snapshot.rateLimitEvents.length >= 3) {
    causes.push({
      title: "Malicious automation pressure",
      confidence: Math.min(0.93, 0.45 + snapshot.rateLimitEvents.length / 20),
      evidence: `${snapshot.rateLimitEvents.length} recent rate-limit events indicate hostile or abusive traffic.`,
    });
  }
  if (!causes.length) {
    causes.push({
      title: "No dominant failure mode",
      confidence: 0.31,
      evidence: "Current telemetry does not indicate a strong single-cause incident signature.",
    });
  }
  return causes.slice(0, 3);
}

function buildAlertCenter(snapshot) {
  const alerts = [];
  if (snapshot.totals.errorRate >= 5) {
    alerts.push({ id: "alert-5xx", severity: "critical", title: "5xx error rate breach", owner: "SRE Lead", state: "open" });
  }
  if (snapshot.totals.avgLatency >= 450) {
    alerts.push({ id: "alert-latency", severity: "warning", title: "Latency SLO breach", owner: "Platform Ops", state: "open" });
  }
  if (snapshot.threatScore >= 45) {
    alerts.push({ id: "alert-threat", severity: "critical", title: "Threat score elevated", owner: "Security Ops", state: "open" });
  }
  if (snapshot.suspiciousEvents?.some((event) => event.illegalAttempt || event.warnings?.includes("Sensitive-path probing detected"))) {
    alerts.push({ id: "alert-illegal", severity: "critical", title: "Illegal access pattern detected", owner: "Security Ops", state: "open" });
  }
  if (!alerts.length) {
    alerts.push({ id: "alert-none", severity: "info", title: "No active escalations", owner: "Automation", state: "monitoring" });
  }
  return alerts;
}

function buildBusinessImpact(snapshot) {
  const checkoutRisk = snapshot.topEndpoint?.name === "/api/orders" || snapshot.noisyEndpoint?.name === "/api/orders";
  const authRisk = snapshot.noisyEndpoint?.name === "/api/auth";
  return {
    summary:
      snapshot.totals.incidentCount > 0
        ? "Customer-facing risk is elevated because the platform is under active reliability pressure."
        : "Customer impact is low right now, with healthy system performance and no major traffic disruption.",
    statements: [
      checkoutRisk ? "Checkout flow may be degraded, which can affect conversions." : "Checkout path is not the primary source of current risk.",
      authRisk ? "Authentication friction may impact sign-in success and user retention." : "Authentication flow is operating within expected bounds.",
      snapshot.threatScore >= 45 ? "Malicious traffic is consuming operational attention and may increase infrastructure cost." : "Threat pressure is currently manageable.",
    ],
  };
}

function buildCapacity(snapshot) {
  return {
    computeLoad: Math.min(100, Math.round(snapshot.totals.currentRps * 7 + snapshot.totals.avgLatency / 8)),
    cachePressure: Math.min(100, Math.round(snapshot.threatScore * 0.55 + snapshot.totals.errorRate * 4)),
    scalingRecommendation:
      snapshot.totals.currentRps >= 8 || snapshot.totals.avgLatency >= 500
        ? "Scale gateway and dependency pool capacity before the next burst."
        : "Current capacity is sufficient for the present traffic profile.",
  };
}

function buildThreatIntel(snapshot) {
  return snapshot.botSummary
    .filter((bot) => bot.bot)
    .map((bot) => ({
      name: bot.name,
      classification: bot.malicious ? "malicious automation" : "search crawler",
      risk: bot.malicious ? "high" : "low",
      blocked: bot.blocked,
    }))
    .slice(0, 5);
}

function buildRoleBriefings(snapshot) {
  return {
    commander: snapshot.totals.incidentCount > 0
      ? `Declare a ${snapshot.totals.errorRate >= 5 ? "SEV-1" : "SEV-2"} style response, assign an owner, and focus the team on ${snapshot.noisyEndpoint?.name || "the hottest endpoint"}.`
      : "No coordinated incident response is required yet; keep the system in active monitoring mode.",
    security: snapshot.threatScore >= 45
      ? `Malicious bot pressure is elevated. Review rate-limit policy, origin patterns, and block events immediately.`
      : "Security posture is stable. Continue monitoring bot classification and recent 429 activity.",
    executive: buildBusinessImpact(snapshot).summary,
    sre: snapshot.rootCauses?.[0]
      ? `Most likely root cause is ${snapshot.rootCauses[0].title}. Prioritize evidence on the top noisy path and validate dependencies.`
      : "No strong root-cause signal yet; continue trend analysis.",
  };
}

function answerQuery(snapshot, query) {
  const prompt = String(query || "").toLowerCase();
  if (prompt.includes("top") && prompt.includes("endpoint")) {
    return {
      title: "Top failing endpoint",
      body: snapshot.noisyEndpoint
        ? `${snapshot.noisyEndpoint.name} has the highest recent error concentration at ${snapshot.noisyEndpoint.errorPct}%.`
        : "No single endpoint is dominating failures right now.",
    };
  }
  if (prompt.includes("bot")) {
    return {
      title: "Bot activity",
      body: snapshot.botSummary.length
        ? `${snapshot.botSummary[0].name} is currently the busiest identified agent, and the threat score is ${snapshot.threatScore}/100.`
        : "Bot activity is currently low.",
    };
  }
  return {
    title: "Telemetry query",
    body: `Current throughput is ${snapshot.totals.currentRps} req/s, average latency is ${snapshot.totals.avgLatency}ms, and error rate is ${snapshot.totals.errorRate}%.`,
  };
}

function normalizePromptStudioInput(input = {}) {
  const brief = String(input.brief || "").trim();
  const objective = String(input.objective || "").trim();
  const audience = String(input.audience || "").trim();
  const tone = String(input.tone || "").trim();
  const outputFormat = String(input.outputFormat || "").trim();
  const constraints = String(input.constraints || "").trim();

  if (!brief) {
    return {
      brief,
      objective,
      audience,
      tone,
      outputFormat,
      constraints,
    };
  }

  const lower = brief.toLowerCase();
  const inferredAudience =
    audience ||
    (lower.includes("executive") || lower.includes("leadership")
      ? "executive stakeholder"
      : lower.includes("security") || lower.includes("threat")
        ? "security analyst"
        : lower.includes("customer")
          ? "support lead"
          : lower.includes("engineer") || lower.includes("sre") || lower.includes("on-call")
            ? "site reliability engineer"
            : "platform operator");

  const inferredTone =
    tone ||
    (lower.includes("formal")
      ? "formal and concise"
      : lower.includes("urgent") || lower.includes("critical")
        ? "decisive and urgent"
        : lower.includes("simple") || lower.includes("plain english")
          ? "simple and direct"
          : "clear and operational");

  const inferredOutput =
    outputFormat ||
    (lower.includes("memo")
      ? "executive summary memo"
      : lower.includes("runbook") || lower.includes("steps")
        ? "step-by-step runbook"
        : lower.includes("table")
          ? "structured table"
          : lower.includes("bullet")
            ? "bullet-point brief"
            : "structured markdown brief");

  const inferredObjective =
    objective ||
    brief
      .replace(/^create\s+/i, "")
      .replace(/^generate\s+/i, "")
      .replace(/^write\s+/i, "")
      .replace(/^build\s+/i, "")
      .replace(/^i need\s+/i, "")
      .replace(/^help me\s+/i, "")
      .trim() ||
    "analyze live API telemetry";

  const inferredConstraints =
    constraints ||
    (lower.includes("evidence")
      ? "ground claims in telemetry and separate facts from assumptions"
      : lower.includes("short")
        ? "keep it short, decisive, and actionable"
        : lower.includes("customer")
          ? "translate technical details into customer impact"
          : "ground conclusions in telemetry and provide actionable next steps");

  return {
    brief,
    objective: inferredObjective,
    audience: inferredAudience,
    tone: inferredTone,
    outputFormat: inferredOutput,
    constraints: inferredConstraints,
  };
}

function buildPromptStudioFallback(input) {
  const normalized = normalizePromptStudioInput(input);
  const objective = normalized.objective || "analyze live API telemetry";
  const audience = normalized.audience || "platform engineer";
  const tone = normalized.tone || "clear and direct";
  const outputFormat = normalized.outputFormat || "structured markdown";
  const constraints = normalized.constraints || "keep it concise and evidence-based";

  return {
    title: `${objective} prompt kit`,
    parsedBrief: {
      brief: normalized.brief || "No natural-language brief provided.",
      objective,
      audience,
      tone,
      outputFormat,
      constraints,
    },
    systemPrompt:
      `You are an expert ${audience} copilot. Help with ${objective}. Use a ${tone} tone. Always ground conclusions in telemetry and provide actionable next steps. Respect these constraints: ${constraints}.`,
    userPrompt:
      `Analyze the current API platform state and help me ${objective}. Return the answer in ${outputFormat}. Highlight risks, supporting evidence, and recommended actions.`,
    evaluationChecklist: [
      "Does the response cite evidence from telemetry or logs?",
      "Does it separate facts, hypotheses, and actions?",
      `Is the tone appropriate for a ${audience}?`,
      `Does it follow the requested output format: ${outputFormat}?`,
    ],
    suggestedAgents: [
      { name: "Incident Commander", purpose: "Drive coordinated response and action items." },
      { name: "Threat Analyst", purpose: "Interpret malicious traffic and rate-limit events." },
      { name: "Executive Briefer", purpose: "Translate technical risk into business impact." },
    ],
    starterPrompts: [
      `Summarize the platform state for a ${audience} in a ${tone} tone.`,
      `Explain the most likely root cause using telemetry evidence and return the answer in ${outputFormat}.`,
      `Recommend the next three actions while respecting this constraint: ${constraints}.`,
    ],
    source: "fallback",
    updatedAt: new Date().toISOString(),
  };
}

function buildIncidentReport(snapshot) {
  return {
    title: `${snapshot.scenarioLabel} Incident Report`,
    executiveSummary:
      snapshot.totals.incidentCount > 0
        ? `The platform is experiencing elevated reliability pressure with ${snapshot.totals.errorRate}% failures and ${snapshot.totals.avgLatency}ms average latency.`
        : "The platform is operating normally with low failure pressure and healthy responsiveness.",
    impact: `${snapshot.totals.totalObserved} requests observed, ${snapshot.rateLimitEvents.length} recent bot mitigation events, health score ${snapshot.totals.healthScore}/100.`,
    rootCause: snapshot.noisyEndpoint
      ? `Most likely issue path is ${snapshot.noisyEndpoint.name}, which currently shows ${snapshot.noisyEndpoint.errorPct}% error concentration.`
      : "No single endpoint dominates the error profile yet.",
    actions: [
      snapshot.topEndpoint ? `Inspect traces and downstream calls for ${snapshot.topEndpoint.name}.` : "Capture a clean baseline snapshot.",
      snapshot.rateLimitEvents.length ? "Review bot mitigation rules and confirm 429 policy behavior." : "Keep monitoring malicious-agent pressure.",
      "Document the timeline and validate post-incident recovery thresholds.",
    ],
    generatedAt: new Date().toISOString(),
  };
}

function buildBriefingPack(snapshot) {
  const incidentReport = buildIncidentReport(snapshot);
  const primaryCause = snapshot.rootCauses?.[0]?.title || "No dominant failure mode";
  const focusPath = snapshot.noisyEndpoint?.name || snapshot.topEndpoint?.name || "gateway traffic";

  return {
    title: "War room briefing pack",
    source: OPENAI_API_KEY ? "live-ai-ready" : "telemetry-pack",
    missionStatus: snapshot.totals.incidentCount > 0 ? "Elevated Response" : "Operationally Stable",
    overview:
      snapshot.totals.incidentCount > 0
        ? `PulseOps is observing a live incident posture. The current response should focus on ${focusPath}, where the strongest telemetry pressure is concentrated.`
        : "PulseOps is in a controlled monitoring posture. Use this pack to present the platform story, the AI tooling, and the operator workflows.",
    talkingPoints: [
      `Health score is ${snapshot.totals.healthScore}/100 with ${snapshot.totals.currentRps} req/s flowing through the gateway.`,
      `Primary reliability hypothesis: ${primaryCause}.`,
      `Threat score is ${snapshot.threatScore}/100 with ${snapshot.rateLimitEvents.length} recent mitigation events.`,
      `AI copilot is ready to answer role-specific questions and generate next-step guidance.`,
    ],
    demoFlow: [
      "Open Command Center",
      "Explain live health and threat posture",
      "Switch scenario or trigger a spike",
      "Ask the copilot for next actions",
      "End with the exportable incident bundle",
    ],
    operatorChecklist: [
      "Confirm backend stream is connected and demo traffic is visible.",
      "Call out the current scenario and why it matters operationally.",
      "Use the AI narrative and root-cause panel together during the demo.",
      "Show the Incident Copilot answering a live telemetry question.",
      "Export the incident bundle to demonstrate reporting and handoff readiness.",
    ],
    roleCards: [
      { role: "Commander", title: "Incident lead narrative", brief: snapshot.roleBriefings.commander },
      { role: "Security", title: "Threat posture brief", brief: snapshot.roleBriefings.security },
      { role: "SRE", title: "Reliability execution brief", brief: snapshot.roleBriefings.sre },
      { role: "Executive", title: "Business-facing summary", brief: snapshot.roleBriefings.executive },
    ],
    promptStarters: [
      {
        title: "Incident commander prompt",
        tag: "Ops AI",
        prompt: `Act as the incident commander for PulseOps. Using the current telemetry snapshot, summarize the active posture, the primary risk around ${focusPath}, and the top three actions for the next 15 minutes.`,
      },
      {
        title: "Security triage prompt",
        tag: "Threat AI",
        prompt: `Review the current PulseOps threat signals, including threat score ${snapshot.threatScore}/100 and recent 429 events. Separate confirmed malicious indicators from hypotheses and propose immediate containment actions.`,
      },
      {
        title: "Executive readout prompt",
        tag: "Business AI",
        prompt: `Turn the current PulseOps telemetry into a short executive brief. Explain customer impact, business risk, and what leadership should expect next without using deep technical jargon.`,
      },
    ],
    demoNarration:
      `This war room shows how PulseOps converts raw API telemetry into operational action. Right now the platform is in ${snapshot.scenarioLabel} mode, with ${snapshot.totals.currentRps} requests per second, ${snapshot.totals.avgLatency} millisecond average latency, and a threat score of ${snapshot.threatScore}. I can move from live detection to root-cause guidance, role-based AI briefings, and a ready-to-export incident package in one flow.`,
    bundleContents: [
      { title: "Snapshot", description: "Live telemetry, top endpoints, threat posture, capacity, and service health." },
      { title: "Incident report", description: incidentReport.executiveSummary },
      { title: "Briefing pack", description: "Talking points, demo flow, operator checklist, and role-based cards." },
    ],
    generatedAt: new Date().toISOString(),
  };
}

async function generateOpenAIPromptStudio(input) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "prompt_studio",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              systemPrompt: { type: "string" },
              userPrompt: { type: "string" },
              evaluationChecklist: {
                type: "array",
                items: { type: "string" },
                minItems: 4,
                maxItems: 5,
              },
              suggestedAgents: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    purpose: { type: "string" },
                  },
                  required: ["name", "purpose"],
                },
                minItems: 3,
                maxItems: 4,
              },
            },
            required: ["title", "systemPrompt", "userPrompt", "evaluationChecklist", "suggestedAgents"],
          },
        },
      },
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text:
                "You generate production-quality prompt kits for AI operations tools. Return concise, useful prompt blocks and an evaluation checklist. Keep the prompts practical and copy-paste ready.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Create a prompt kit from this configuration: ${JSON.stringify(input)}.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI prompt studio error ${response.status}: ${message}`);
  }

  const data = await response.json();
  if (!data.output_text) {
    throw new Error("OpenAI prompt studio response did not include output_text");
  }

  return {
    ...JSON.parse(data.output_text),
    source: "openai",
    updatedAt: new Date().toISOString(),
    model: OPENAI_MODEL,
  };
}

function buildSnapshot() {
  const requests = state.requests;
  const totalReqs = requests.length;
  const avgLatency = totalReqs
    ? Math.round(requests.reduce((sum, request) => sum + request.latency, 0) / totalReqs)
    : 0;
  const errorCount = requests.filter((request) => request.status >= 500).length;
  const errorRate = totalReqs ? Number(((errorCount / totalReqs) * 100).toFixed(1)) : 0;
  const endpointRows = buildEndpointRows(requests);
  const topEndpoint = endpointRows[0] || null;
  const noisyEndpoint = [...endpointRows].sort((left, right) => right.errorPct - left.errorPct)[0] || null;
  const healthScore = Math.max(
    0,
    Math.min(100, Math.round(100 - errorRate * 7 - Math.max(0, avgLatency - 180) / 8)),
  );
  const botSummary = Object.values(
    requests.reduce((accumulator, request) => {
      if (!request.agentName) return accumulator;

      if (!accumulator[request.agentName]) {
        accumulator[request.agentName] = {
          name: request.agentName,
          bot: request.bot,
          malicious: request.malicious,
          requests: 0,
          blocked: 0,
          lastSeen: request.ts,
        };
      }

      accumulator[request.agentName].requests += 1;
      if (request.blocked) accumulator[request.agentName].blocked += 1;
      accumulator[request.agentName].lastSeen = Math.max(accumulator[request.agentName].lastSeen, request.ts);
      return accumulator;
    }, {}),
  ).sort((left, right) => right.requests - left.requests);

  const snapshot = {
    now: Date.now(),
    requests,
    sparkData: state.sparkData,
    totals: {
      totalObserved: state.totals.total,
      totalErrors: state.totals.errors,
      rollingCount: totalReqs,
      avgLatency,
      errorRate,
      healthScore,
      currentRps: state.sparkData[state.sparkData.length - 1]?.rps || 0,
      peakRps: Math.max(...state.sparkData.map((point) => point.rps), 0),
      incidentCount: requests.filter((request) => request.status >= 500 || request.latency > 1200).length,
    },
    topEndpoint,
    noisyEndpoint,
    endpointRows,
    botSummary,
    rateLimitEvents: state.rateLimitEvents,
    regionDist: buildRegionDistribution(requests),
    siteRows: buildSiteRows(requests),
    statusDist: buildDistribution(requests, (request) => classifyStatus(request.status)),
    methodDist: buildDistribution(requests, (request) => request.method),
    scenario: state.scenario,
    scenarioLabel: getScenarioState().label,
    monitoredSites: state.sites,
  };
  snapshot.suspiciousEvents = buildSuspiciousEvents(requests);

  snapshot.threatScore = Math.min(
    100,
    Math.round(
      snapshot.rateLimitEvents.length * 7 +
      snapshot.botSummary.filter((bot) => bot.malicious).reduce((sum, bot) => sum + bot.requests, 0) * 0.6 +
      snapshot.totals.errorRate * 4,
    ),
  );
  snapshot.sla = buildSla(snapshot);
  snapshot.serviceHealth = buildServiceHealth(snapshot);
  snapshot.timeline = buildTimeline(snapshot);
  snapshot.rootCauses = buildRootCauses(snapshot);
  snapshot.alertCenter = buildAlertCenter(snapshot);
  snapshot.businessImpact = buildBusinessImpact(snapshot);
  snapshot.capacity = buildCapacity(snapshot);
  snapshot.threatIntel = buildThreatIntel(snapshot);
  snapshot.roleBriefings = buildRoleBriefings(snapshot);
  snapshot.architecture = ARCHITECTURE;
  snapshot.auditTrail = state.auditTrail;
  snapshot.securityWarnings = buildSecurityWarnings(snapshot);

  return snapshot;
}

function buildHomeSummary(snapshot = buildSnapshot()) {
  const serviceWarningCount = (snapshot.serviceHealth || []).filter((item) => item.status !== "healthy").length;
  const priorityAlert = snapshot.alertCenter?.[0];
  const leadBriefing = snapshot.roleBriefings?.[0];
  const topServices = (snapshot.serviceHealth || []).slice(0, 3);
  const topSites = (snapshot.siteRows || []).slice(0, 3).map((site) => ({
    id: site.siteKey,
    name: site.name,
    domain: site.domain,
    status: site.riskScore >= 70 ? "elevated" : site.riskScore >= 45 ? "watch" : "healthy",
    requests: site.requests || 0,
    riskScore: site.riskScore || 0,
  }));
  const recentAudit = (snapshot.auditTrail || []).slice(0, 4).map((entry) => ({
    id: entry.id,
    title: entry.action,
    detail: entry.detail,
    meta: `${entry.actor || "system"} · ${new Date(entry.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
  }));

  return {
    ts: Date.now(),
    headline: "AI-native security operations",
    hero: {
      title: "PulseOps turns live telemetry into decisions, narratives, and action.",
      detail: "The home API packages real-time system posture into a clean entry experience for operators, judges, and external users.",
      nextBestMove: priorityAlert?.title || "Lead with the AI analyst, then pivot into analytics and exports.",
      nextBestMoveDetail: priorityAlert?.detail || "Start with the strongest live signal, then use analytics and exports to turn that state into a polished story.",
    },
    stats: [
      { label: "Core Modules", value: "11", detail: "Focused monitoring, analysis, reporting, automation, and admin surfaces" },
      { label: "Live Signals", value: String((snapshot.auditTrail || []).length).padStart(2, "0"), detail: "Recent audit and platform activity" },
      { label: "Threat Score", value: String(snapshot.threatScore || 0), detail: `${snapshot.scenarioLabel || "Normal Ops"} scenario posture` },
      { label: "Current RPS", value: String(snapshot.totals?.currentRps || 0), detail: "Real-time request flow from the live stream" },
    ],
    feed: recentAudit.length ? recentAudit : (snapshot.alertCenter || []).slice(0, 4).map((item, index) => ({
      id: item.id || `alert-${index}`,
      title: item.title,
      detail: item.detail,
      meta: `${item.tone || "info"} · live`,
    })),
    modules: [
      { id: "security", eyebrow: "AI Analyst", title: "Explain threats, not just metrics", copy: "Turn anomalies into likely root cause, active risk, and suggested response guidance.", cta: "Open Security Analyst", tone: "info" },
      { id: "chat", eyebrow: "Conversational UX", title: "Ask the platform what matters right now", copy: "Use the same live telemetry in a natural-language workspace for incidents, impact, and next actions.", cta: "Open Chat Workspace", tone: "success" },
      { id: "analytics", eyebrow: "Executive Readout", title: "Move from live ops into decision-grade insight", copy: "Translate system state into trends, business framing, and higher-level risk discussion.", cta: "Open Analytics Hub", tone: "warning" },
    ],
    launchpad: [
      { id: "war-room", label: "War Room", text: "Coordinate response, next steps, and briefings.", accent: "danger" },
      { id: "studio", label: "Prompt Studio", text: "Design reusable AI prompts for the demo and operations.", accent: "violet" },
      { id: "sites", label: "Website Monitor", text: "Show live data capture and monitoring credibility.", accent: "info" },
      { id: "automation", label: "Automation Center", text: "Trigger playbooks, reports, alerts, and edge controls automatically.", accent: "success" },
      { id: "security", label: "Security Analyst", text: "Translate signals into diagnosis and recommended response.", accent: "success" },
      { id: "analytics", label: "Analytics Hub", text: "Compare trends, anomalies, and system behavior over time.", accent: "warning" },
      { id: "exports", label: "Export Center", text: "Package the narrative as polished artifacts and reports.", accent: "info" },
    ],
    status: {
      scenario: snapshot.scenarioLabel,
      currentRps: snapshot.totals?.currentRps || 0,
      avgLatency: snapshot.totals?.avgLatency || 0,
      serviceWarnings: serviceWarningCount,
      copilotPrompt: leadBriefing?.summary || "Ask the AI analyst for the highest-risk issue and recommended next steps.",
    },
    essentials: {
      monitoredSiteCount: snapshot.siteRows?.length || 0,
      alertCount: snapshot.alertCenter?.length || 0,
      incidentCount: snapshot.totals?.incidentCount || 0,
      topServices,
      topSites,
    },
  };
}

function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((response) => response.write(message));
}

function attachRealtimeClient(req, res, eventName, payload) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write("event: connected\ndata: {}\n\n");
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
}

function recordRequest(request) {
  state.requests = [request, ...state.requests].slice(0, requestLimit);
  state.totals.total += 1;
  if (request.status >= 500) state.totals.errors += 1;

  state.bucket.reqs += 1;
  state.bucket.latSum += request.latency;
  if (request.status >= 500) state.bucket.errs += 1;

  const statusClass = classifyStatus(request.status);
  state.bucket.byStatus[statusClass] = (state.bucket.byStatus[statusClass] || 0) + 1;
}

function sanitizeMetrics(payload = {}) {
  return {
    rps: Number(payload.rps || 0),
    peakRps: Number(payload.peakRps || 0),
    avgLatency: Number(payload.avgLatency || 0),
    errorRate: Number(payload.errorRate || 0),
    healthScore: Number(payload.healthScore || 0),
    incidentCount: Number(payload.incidentCount || 0),
    topEndpoint: payload.topEndpoint || null,
    noisyEndpoint: payload.noisyEndpoint || null,
  };
}

function buildFallbackInsight(metrics) {
  const hotspots = [metrics.noisyEndpoint, metrics.topEndpoint].filter(Boolean);
  const primaryHotspot = hotspots[0];
  const actions = [];
  let headline = "System stable";
  let severity = "normal";
  let summary = "Traffic is steady and there are no strong outage indicators in the current window.";

  if (metrics.errorRate >= 5 || metrics.avgLatency >= 700) {
    headline = "Likely active incident";
    severity = "high";
    summary =
      "The system is showing a mix of elevated failures and unhealthy latency, which usually points to a dependency problem or overloaded endpoint.";
    actions.push(
      "Inspect the hottest endpoint and compare successful traces against failing ones.",
      "Check dependency health, especially databases, caches, or downstream APIs.",
      "Throttle or shed lower-priority traffic if latency keeps climbing.",
    );
  } else if (metrics.errorRate >= 2 || metrics.avgLatency >= 350) {
    headline = "Performance regression detected";
    severity = "medium";
    summary =
      "Reliability is still holding, but response times or failures are trending in the wrong direction and could degrade further under load.";
    actions.push(
      "Watch the busiest route for saturation or query regressions.",
      "Review recent deploys or config changes tied to the latency increase.",
      "Set a tighter alert threshold before the next traffic spike.",
    );
  } else {
    actions.push(
      "Keep monitoring trend lines for bursts in 4xx and 5xx traffic.",
      "Use the calm period to define a runbook for the noisiest endpoint.",
      "Capture a baseline snapshot so future regressions are easier to spot.",
    );
  }

  if (primaryHotspot?.name) {
    summary += ` The strongest hotspot right now is ${primaryHotspot.name}.`;
  }

  return {
    headline,
    severity,
    summary,
    actions,
    source: "fallback",
    updatedAt: new Date().toISOString(),
  };
}

function buildCopilotFallback(snapshot, question) {
  const prompt = String(question || "").toLowerCase();
  const topEndpoint = snapshot.topEndpoint;
  const noisyEndpoint = snapshot.noisyEndpoint;
  const bullets = [];
  let answer = "The system is currently quiet, so there is not much incident pressure to explain yet.";

  if (prompt.includes("latency")) {
    answer =
      snapshot.totals.avgLatency >= 350
        ? `Latency is elevated at ${snapshot.totals.avgLatency}ms, which suggests queueing pressure or a slow dependency.`
        : `Latency is currently healthy at ${snapshot.totals.avgLatency}ms, so there is no active slowdown signal.`;
    bullets.push(
      topEndpoint ? `${topEndpoint.name} is carrying the heaviest traffic.` : "No dominant endpoint has emerged yet.",
      noisyEndpoint ? `${noisyEndpoint.name} is contributing the most reliability noise.` : "Error pressure is still low across routes.",
      "Compare p95 latency on the top endpoints before investigating infrastructure.",
    );
  } else if (prompt.includes("endpoint") || prompt.includes("failing")) {
    answer = noisyEndpoint
      ? `${noisyEndpoint.name} is the most suspicious endpoint right now because it has the highest error concentration.`
      : "No single endpoint is failing enough yet to dominate the incident picture.";
    bullets.push(
      topEndpoint ? `${topEndpoint.name} is the busiest route in the rolling window.` : "Traffic is still sparse.",
      noisyEndpoint ? `${noisyEndpoint.errorPct}% of recent requests on ${noisyEndpoint.name} are error-class.` : "Recent traffic is mostly clean.",
      "Inspect traces and downstream dependencies for the noisiest route first.",
    );
  } else if (prompt.includes("what should") || prompt.includes("next")) {
    answer =
      snapshot.totals.incidentCount > 0
        ? "Start with the noisiest endpoint, compare fast vs slow traces, and check downstream services."
        : "Use the calm period to capture a baseline, tighten alerts, and document a runbook for the busiest path.";
    bullets.push(
      `Health score is ${snapshot.totals.healthScore}/100.`,
      `Current throughput is ${snapshot.totals.currentRps} req/s with ${snapshot.totals.errorRate}% 5xx rate.`,
      "Treat endpoint-level evidence as the fastest route to a useful root-cause hypothesis.",
    );
  } else {
    answer =
      snapshot.totals.incidentCount > 0
        ? `The platform shows a ${snapshot.totals.errorRate}% failure rate and ${snapshot.totals.avgLatency}ms latency, so the system is in a mild-to-moderate incident posture.`
        : "The platform looks stable overall, with low failure pressure and healthy responsiveness.";
    bullets.push(
      topEndpoint ? `${topEndpoint.name} is leading traffic volume.` : "Traffic volume is still light.",
      noisyEndpoint ? `${noisyEndpoint.name} is the first route to investigate.` : "Noisy endpoints have not separated from the pack yet.",
      "Ask about latency, failing endpoints, or recommended next steps for a more targeted diagnosis.",
    );
  }

  return {
    answer,
    bullets,
    source: "fallback",
    updatedAt: new Date().toISOString(),
  };
}

async function generateOpenAIInsight(metrics) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "incident_brief",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              headline: { type: "string" },
              severity: { type: "string", enum: ["normal", "medium", "high"] },
              summary: { type: "string" },
              actions: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 3,
              },
            },
            required: ["headline", "severity", "summary", "actions"],
          },
        },
      },
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text:
                "You are an SRE incident analyst. Return concise JSON only. Explain current system behavior, name the most likely reliability risk, and recommend exactly three concrete next actions. Keep the summary under 70 words.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze this API telemetry snapshot: ${JSON.stringify(metrics)}.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${message}`);
  }

  const data = await response.json();
  if (!data.output_text) {
    throw new Error("OpenAI response did not include output_text");
  }

  return {
    ...JSON.parse(data.output_text),
    source: "openai",
    updatedAt: new Date().toISOString(),
    model: OPENAI_MODEL,
  };
}

async function generateOpenAICopilot(snapshot, question) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "copilot_answer",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              answer: { type: "string" },
              bullets: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 4,
              },
            },
            required: ["answer", "bullets"],
          },
        },
      },
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text:
                "You are a technical incident copilot for an API observability dashboard. Answer the user question using the telemetry snapshot. Keep the answer under 90 words and provide 3 or 4 crisp supporting bullets.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Telemetry snapshot: ${JSON.stringify(snapshot)}. User question: ${question}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI copilot error ${response.status}: ${message}`);
  }

  const data = await response.json();
  if (!data.output_text) {
    throw new Error("OpenAI copilot response did not include output_text");
  }

  return {
    ...JSON.parse(data.output_text),
    source: "openai",
    updatedAt: new Date().toISOString(),
    model: OPENAI_MODEL,
  };
}

function flushMetrics() {
  const bucket = state.bucket;
  const avgLatency = bucket.reqs ? Math.round(bucket.latSum / bucket.reqs) : 0;

  state.sparkData = [
    ...state.sparkData.slice(1),
    {
      tick: state.sparkData[state.sparkData.length - 1].tick + 1,
      rps: bucket.reqs,
      latency: avgLatency,
      errors: bucket.errs,
      "2xx": bucket.byStatus["2xx"] || 0,
      "3xx": bucket.byStatus["3xx"] || 0,
      "4xx": bucket.byStatus["4xx"] || 0,
      "5xx": bucket.byStatus["5xx"] || 0,
    },
  ];

  state.bucket = {
    reqs: 0,
    latSum: 0,
    errs: 0,
    byStatus: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 },
  };

  const snapshot = buildSnapshot();
  const insertHistory = db.prepare(
    "INSERT INTO history_points (site_key, ts, rps, latency, error_rate, threat_score, risk_score) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const now = Date.now();

  insertHistory.run("global", now, snapshot.totals.currentRps || 0, snapshot.totals.avgLatency || 0, snapshot.totals.errorRate || 0, snapshot.threatScore || 0, buildRiskScore(snapshot.requests || []));
  snapshot.siteRows.forEach((site) => {
    insertHistory.run(site.siteKey, now, site.requests || 0, site.avgLatency || 0, site.errorRate || 0, snapshot.threatScore || 0, site.riskScore || 0);
  });

  db.prepare(
    "DELETE FROM history_points WHERE id NOT IN (SELECT id FROM history_points ORDER BY ts DESC LIMIT 5000)",
  ).run();

  evaluateAutomationRules(snapshot);
  broadcast("snapshot", snapshot);
  broadcast("home", buildHomeSummary(snapshot));
}

setInterval(flushMetrics, 1000);

setInterval(() => {
  const site = state.sites[0] || DEFAULT_SITE;
  const runtimeConfig = getRuntimeConfig(site.siteKey);
  if (!shouldGenerateBackgroundDemo(site, runtimeConfig)) {
    return;
  }

  const burstSize = runtimeConfig.trafficMode === "demo_only" ? 3 : 2;
  for (let index = 0; index < burstSize; index += 1) {
    const endpoint = pick(DEMO_SIMULATION_ENDPOINTS);
    const method = pick(["GET", "GET", "POST", "PUT", "DELETE"]);
    generateSimulatedDemoRequest(site, endpoint, method);
  }
}, 1500);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "backend",
    ts: Date.now(),
    mode: OPENAI_API_KEY ? "openai-connected" : "fallback",
    redis: ENABLE_REDIS ? "enabled" : "disabled",
    monitoredSites: state.sites.length,
  });
});

app.post("/api/auth/register", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const organization = String(req.body?.organization || "PulseOps Workspace").trim();
  const role = String(req.body?.role || "Platform Operator").trim();

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "email must be valid" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "password must be at least 8 characters" });
  }

  try {
    db.prepare(
      "INSERT INTO users (name, email, organization, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(name, email, organization, role, hashPassword(password), new Date().toISOString());
  } catch (error) {
    return res.status(409).json({ error: "account already exists" });
  }

  const user = db.prepare("SELECT name, email, organization, role, created_at FROM users WHERE email = ?").get(email);
  logAudit("auth.register", email);
  return res.status(201).json({
    user: {
      name: user.name,
      email: user.email,
      organization: user.organization,
      role: user.role,
      createdAt: user.created_at,
    },
    token: generateToken("pulseops"),
  });
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || user.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  logAudit("auth.login", email);
  return res.json({
    user: {
      name: user.name,
      email: user.email,
      organization: user.organization,
      role: user.role,
      createdAt: user.created_at,
    },
    token: generateToken("pulseops"),
  });
});

app.get("/sdk/pulseops.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.send(`(function(){var config={siteKey:"",apiKey:"",collectorUrl:""};function send(payload){if(!config.collectorUrl||!config.siteKey||!config.apiKey)return;var body=JSON.stringify(Object.assign({siteKey:config.siteKey,apiKey:config.apiKey,userAgent:navigator.userAgent,referrer:document.referrer||""},payload));if(navigator.sendBeacon){navigator.sendBeacon(config.collectorUrl,new Blob([body],{type:"application/json"}));}else{fetch(config.collectorUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:body}).catch(function(){});}}window.PulseOps={init:function(next){config=Object.assign(config,next||{});},trackPageView:function(){send({path:window.location.pathname,method:"GET",status:200,latency:Math.round(60+Math.random()*90),bytes:2048,region:Intl.DateTimeFormat().resolvedOptions().timeZone||"browser"});},trackApiError:function(path,status,latency){send({path:path||window.location.pathname,method:"POST",status:status||500,latency:latency||420,bytes:1024,region:Intl.DateTimeFormat().resolvedOptions().timeZone||"browser"});},trackEvent:function(name,meta){send(Object.assign({path:"/sdk/"+(name||"event"),method:"POST",status:200,latency:120,bytes:512,region:Intl.DateTimeFormat().resolvedOptions().timeZone||"browser"},meta||{}));}};}());`);
});

app.get("/api/dashboard/snapshot", (req, res) => {
  res.json(buildSnapshot());
});

app.get("/api/home/summary", (req, res) => {
  res.json(buildHomeSummary());
});

app.get("/api/metrics", (req, res) => {
  const snapshot = buildSnapshot();
  res.json({
    total: snapshot.totals.totalObserved,
    errors: snapshot.totals.totalErrors,
    rollingCount: snapshot.totals.rollingCount,
    error_rate: snapshot.totals.errorRate.toFixed(1),
    avg_latency: snapshot.totals.avgLatency,
    healthScore: snapshot.totals.healthScore,
    ts: Date.now(),
  });
});

app.get("/api/metrics/history", (req, res) => {
  const siteKey = String(req.query.siteKey || "global");
  const rows = db.prepare("SELECT ts, rps, latency, error_rate AS errorRate, threat_score AS threatScore, risk_score AS riskScore FROM history_points WHERE site_key = ? ORDER BY ts DESC LIMIT 120").all(siteKey).reverse();
  res.json({ range: req.query.range || "1m", rows: rows.length ? rows : state.sparkData });
});

app.get("/api/metrics/endpoints", (req, res) => {
  res.json({ rows: buildEndpointRows(state.requests) });
});

app.get("/api/audit", (req, res) => {
  res.json({
    rows: state.auditTrail,
    count: state.auditTrail.length,
    deliveries: state.deliveryLog,
    ts: Date.now(),
  });
});

app.get("/api/admin/overview", (req, res) => {
  const users = db.prepare("SELECT name, email, organization, role, created_at FROM users ORDER BY created_at DESC LIMIT 20").all();
  const webhooks = db.prepare("SELECT * FROM webhooks ORDER BY created_at DESC LIMIT 20").all();
  const sharedReports = db.prepare("SELECT id, title, created_at FROM shared_reports ORDER BY created_at DESC LIMIT 20").all();
  res.json({
    users,
    webhooks,
    sharedReports,
    sites: state.sites,
    edgePolicies: Object.values(state.edgePolicies),
    runtimeConfig: Object.values(state.runtimeConfig),
    automationRules: state.automationRules,
    automationRuns: listAutomationRuns(20),
    deliveryLog: state.deliveryLog,
  });
});

app.get("/api/sites", (req, res) => {
  const snapshot = buildSnapshot();
  res.json({
    rows: state.sites.map((site) => {
      const live = snapshot.siteRows.find((item) => item.siteKey === site.siteKey);
      return {
        ...site,
        requests: live?.requests || 0,
        avgLatency: live?.avgLatency || 0,
        errorRate: live?.errorRate || 0,
        bots: live?.bots || 0,
        blocked: live?.blocked || 0,
        warnings: live?.warnings || 0,
        riskScore: live?.riskScore || 0,
        trafficMode: getRuntimeConfig(site.siteKey).trafficMode,
        trafficSources: buildTrafficSourceSummary(state.requests, site.siteKey),
      };
    }),
    count: state.sites.length,
    ts: Date.now(),
  });
});

app.post("/api/sites/register", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const domain = normalizeDomain(req.body?.domain || "");

  if (!name || !domain) {
    return res.status(400).json({ error: "name and domain are required" });
  }

  const site = createSite(name, domain);
  const baseUrl = getBaseUrl(req);
  logAudit("site.registered", `${site.name} (${site.domain})`);
  return res.status(201).json({
    site,
    snippet: buildSiteSnippet(site, baseUrl),
    collectorUrl: `${baseUrl}/api/collect`,
  });
});

app.post("/api/sites/:siteKey/rotate-key", (req, res) => {
  const site = state.sites.find((item) => item.siteKey === req.params.siteKey);
  if (!site) {
    return res.status(404).json({ error: "site not found" });
  }

  const apiKey = generateApiKey();
  db.prepare("UPDATE sites SET api_key = ? WHERE site_key = ?").run(apiKey, site.siteKey);
  syncSitesFromDb();
  const updated = state.sites.find((item) => item.siteKey === site.siteKey);
  const baseUrl = getBaseUrl(req);
  logAudit("site.api-key-rotated", updated.name);
  return res.json({
    site: updated,
    snippet: buildSiteSnippet(updated, baseUrl),
  });
});

app.get("/api/sites/:siteKey/snippet", (req, res) => {
  const site = state.sites.find((item) => item.siteKey === req.params.siteKey);
  if (!site) {
    return res.status(404).json({ error: "site not found" });
  }

  const baseUrl = getBaseUrl(req);
  return res.json({
    site,
    snippet: buildSiteSnippet(site, baseUrl),
    collectorUrl: `${baseUrl}/api/collect`,
  });
});

app.get("/api/sites/:siteKey/overview", (req, res) => {
  const site = state.sites.find((item) => item.siteKey === req.params.siteKey);
  if (!site) {
    return res.status(404).json({ error: "site not found" });
  }

  return res.json(buildSiteOverview(site.siteKey));
});

app.get("/api/sites/:siteKey/edge-config", (req, res) => {
  const site = state.sites.find((item) => item.siteKey === req.params.siteKey);
  if (!site) {
    return res.status(404).json({ error: "site not found" });
  }
  return res.json({
    site: { siteKey: site.siteKey, name: site.name, domain: site.domain },
    policy: getEdgePolicy(site.siteKey),
    posture: buildEdgePosture(site, state.requests.filter((request) => request.siteKey === site.siteKey)),
  });
});

app.get("/api/sites/:siteKey/runtime-config", (req, res) => {
  const site = state.sites.find((item) => item.siteKey === req.params.siteKey);
  if (!site) {
    return res.status(404).json({ error: "site not found" });
  }
  return res.json({
    site: { siteKey: site.siteKey, name: site.name, domain: site.domain },
    config: getRuntimeConfig(site.siteKey),
    trafficSources: buildTrafficSourceSummary(state.requests, site.siteKey),
  });
});

app.post("/api/sites/:siteKey/runtime-config", (req, res) => {
  const site = state.sites.find((item) => item.siteKey === req.params.siteKey);
  if (!site) {
    return res.status(404).json({ error: "site not found" });
  }
  const config = updateRuntimeConfig(site.siteKey, req.body || {});
  logAudit("site.runtime-updated", `${site.name} -> ${config.trafficMode}`);
  return res.json({
    site: { siteKey: site.siteKey, name: site.name, domain: site.domain },
    config,
    trafficSources: buildTrafficSourceSummary(state.requests, site.siteKey),
  });
});

app.post("/api/sites/:siteKey/edge-config", (req, res) => {
  const site = state.sites.find((item) => item.siteKey === req.params.siteKey);
  if (!site) {
    return res.status(404).json({ error: "site not found" });
  }
  const policy = updateEdgePolicy(site.siteKey, req.body || {});
  logAudit("edge.policy-updated", `${site.name} -> ${policy.securityMode}/${policy.wafMode}/${policy.botFightMode}`);
  return res.json({
    site: { siteKey: site.siteKey, name: site.name, domain: site.domain },
    policy,
    posture: buildEdgePosture(site, state.requests.filter((request) => request.siteKey === site.siteKey)),
  });
});

app.post("/api/security/playbook", (req, res) => {
  const siteKey = String(req.body?.siteKey || "").trim();
  const overview = buildSiteOverview(siteKey || DEFAULT_SITE.siteKey);
  logAudit("security.playbook", `${overview.site.name} playbook generated`);
  return res.json(overview.playbook);
});

app.post("/api/security/weekly-summary", (req, res) => {
  const siteKey = String(req.body?.siteKey || "").trim();
  const overview = buildSiteOverview(siteKey || DEFAULT_SITE.siteKey);
  logAudit("security.weekly-summary", `${overview.site.name} weekly summary generated`);
  return res.json(overview.weeklySummary);
});

app.post("/api/threat-hunt", (req, res) => {
  const siteKey = String(req.body?.siteKey || "").trim();
  const query = String(req.body?.query || "").trim();
  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }

  const result = searchThreats(siteKey || DEFAULT_SITE.siteKey, query);
  logAudit("security.hunt", `${result.title}`);
  return res.json(result);
});

app.get("/api/history/overview", (req, res) => {
  const siteKey = String(req.query.siteKey || "global");
  const rows = db.prepare("SELECT ts, rps, latency, error_rate AS errorRate, threat_score AS threatScore, risk_score AS riskScore FROM history_points WHERE site_key = ? ORDER BY ts DESC LIMIT 120").all(siteKey).reverse();
  const recent = rows.slice(-12);
  const previous = rows.slice(-24, -12);
  const avg = (items, key) => (items.length ? items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length : 0);

  res.json({
    rows,
    trends: {
      currentLatency: Math.round(avg(recent, "latency")),
      previousLatency: Math.round(avg(previous, "latency")),
      currentThreat: Math.round(avg(recent, "threatScore")),
      previousThreat: Math.round(avg(previous, "threatScore")),
      currentRisk: Math.round(avg(recent, "riskScore")),
      previousRisk: Math.round(avg(previous, "riskScore")),
    },
    anomalyScore: Math.max(0, Math.round(avg(recent, "latency") / Math.max(1, avg(previous, "latency") || avg(recent, "latency")) * 40 + avg(recent, "threatScore") * 0.4)),
  });
});

app.get("/api/history/incidents/compare", (req, res) => {
  const snapshot = buildSnapshot();
  const globalRows = db.prepare("SELECT ts, latency, error_rate AS errorRate, threat_score AS threatScore, risk_score AS riskScore FROM history_points WHERE site_key = ? ORDER BY ts DESC LIMIT 48").all("global");
  const latest = globalRows.slice(0, 12);
  const prior = globalRows.slice(12, 24);
  const average = (items, key) => (items.length ? items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length : 0);

  res.json({
    latestWindow: {
      latency: Math.round(average(latest, "latency")),
      errorRate: Number(average(latest, "errorRate").toFixed(1)),
      threatScore: Math.round(average(latest, "threatScore")),
      riskScore: Math.round(average(latest, "riskScore")),
    },
    previousWindow: {
      latency: Math.round(average(prior, "latency")),
      errorRate: Number(average(prior, "errorRate").toFixed(1)),
      threatScore: Math.round(average(prior, "threatScore")),
      riskScore: Math.round(average(prior, "riskScore")),
    },
    currentScenario: snapshot.scenarioLabel,
  });
});

app.get("/api/webhooks", (req, res) => {
  const rows = db.prepare("SELECT * FROM webhooks ORDER BY created_at DESC").all();
  res.json({ rows, deliveryLog: state.deliveryLog });
});

app.post("/api/webhooks", (req, res) => {
  const channel = String(req.body?.channel || "slack").trim();
  const target = String(req.body?.target || "").trim();
  const siteKey = req.body?.siteKey ? String(req.body.siteKey).trim() : null;
  if (!target) {
    return res.status(400).json({ error: "target is required" });
  }

  const createdAt = new Date().toISOString();
  const result = db.prepare("INSERT INTO webhooks (site_key, channel, target, status, created_at, last_delivery_at) VALUES (?, ?, ?, ?, ?, ?)").run(siteKey, channel, target, "active", createdAt, null);
  logAudit("webhook.created", `${channel} -> ${target}`);
  return res.status(201).json({ id: result.lastInsertRowid, siteKey, channel, target, status: "active", createdAt });
});

app.get("/api/automation/overview", (req, res) => {
  res.json({
    rules: state.automationRules,
    runs: listAutomationRuns(30),
    sites: state.sites.map((site) => ({ siteKey: site.siteKey, name: site.name, domain: site.domain })),
    catalogs: {
      metrics: [
        { id: "site_risk_score", label: "Site risk score" },
        { id: "site_error_rate", label: "Site error rate" },
        { id: "site_blocked_requests", label: "Site blocked requests" },
        { id: "site_bot_requests", label: "Site bot requests" },
        { id: "global_threat_score", label: "Global threat score" },
        { id: "global_error_rate", label: "Global error rate" },
        { id: "global_latency", label: "Global average latency" },
      ],
      comparators: [
        { id: "gte", label: "Greater than or equal to" },
        { id: "lte", label: "Less than or equal to" },
      ],
      actions: [
        { id: "notify_webhook", label: "Deliver webhook alert" },
        { id: "edge_lockdown", label: "Apply edge lockdown" },
        { id: "generate_playbook", label: "Generate playbook and alert" },
        { id: "share_report", label: "Create shared incident report" },
      ],
    },
  });
});

app.post("/api/automation/rules", (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) {
    return res.status(400).json({ error: "rule name is required" });
  }
  const rule = createAutomationRule(req.body || {});
  logAudit("automation.rule-created", rule.name);
  return res.status(201).json({ rule });
});

app.post("/api/automation/rules/:id", (req, res) => {
  const rule = updateAutomationRule(req.params.id, req.body || {});
  if (!rule) {
    return res.status(404).json({ error: "automation rule not found" });
  }
  logAudit("automation.rule-updated", rule.name);
  return res.json({ rule });
});

app.post("/api/automation/evaluate", (req, res) => {
  const snapshot = buildSnapshot();
  const triggered = evaluateAutomationRules(snapshot, { manual: true });
  return res.json({
    triggered,
    count: triggered.length,
    runs: listAutomationRuns(20),
  });
});

app.post("/api/share/report", (req, res) => {
  const snapshot = buildSnapshot();
  const report = buildIncidentReport(snapshot);
  const id = `share_${Math.random().toString(36).slice(2, 10)}`;
  db.prepare("INSERT INTO shared_reports (id, title, payload_json, created_at) VALUES (?, ?, ?, ?)").run(id, report.title, JSON.stringify({ report, snapshot }), new Date().toISOString());
  logAudit("report.shared", report.title);
  res.json({ id, url: `${getBaseUrl(req)}/api/share/${id}`, report });
});

app.get("/api/share/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM shared_reports WHERE id = ?").get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: "shared report not found" });
  }
  return res.json({ id: row.id, title: row.title, createdAt: row.created_at, payload: JSON.parse(row.payload_json) });
});

app.post("/api/logs/ingest", (req, res) => {
  const raw = String(req.body?.raw || "").trim();
  const siteKey = String(req.body?.siteKey || DEFAULT_SITE.siteKey);
  const site = state.sites.find((item) => item.siteKey === siteKey) || state.sites[0];
  const runtimeConfig = getRuntimeConfig(site.siteKey);
  if (!raw) {
    return res.status(400).json({ error: "raw log line is required" });
  }
  if (!runtimeConfig.ingestLogs) {
    return res.status(409).json({ error: "log ingestion disabled for this site" });
  }

  const match = raw.match(/"(GET|POST|PUT|DELETE|PATCH)\s+([^"\s]+)[^"]*"\s+(\d{3})/i);
  const uaMatch = raw.match(/"([^"]+)"\s*$/);
  const requestRecord = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    method: match?.[1] || "GET",
    endpoint: match?.[2] || "/",
    status: Number(match?.[3] || 200),
    latency: randomBetween(50, 240),
    bytes: randomBetween(512, 4096),
    region: "us-west",
    trace: `trc_${Math.random().toString(36).slice(2, 10)}`,
    agentName: uaMatch?.[1] || "nginx-client",
    bot: false,
    malicious: false,
    blocked: false,
    illegalAttempt: false,
    warnings: [],
    siteKey: site.siteKey,
    siteName: site.name,
    siteDomain: site.domain,
    country: "United States",
    asn: "Imported Log",
    trustLevel: "trusted",
    sourceType: "ingested_log",
  };
  const signals = detectThreatSignals({ endpoint: requestRecord.endpoint, userAgent: requestRecord.agentName, status: requestRecord.status, ip: "", blocked: false });
  requestRecord.bot = signals.bot;
  requestRecord.malicious = signals.malicious;
  requestRecord.illegalAttempt = signals.illegalAttempt;
  requestRecord.warnings = signals.warnings;
  requestRecord.trustLevel = classifyTrust({ ...signals, blocked: false, status: requestRecord.status });
  recordRequest(requestRecord);
  logAudit("logs.ingested", `${site.name} log parsed`);
  res.status(202).json({ ok: true, parsed: requestRecord });
});

app.post("/api/collect", (req, res) => {
  const siteKey = String(req.body?.siteKey || "").trim();
  const site = state.sites.find((item) => item.siteKey === siteKey);
  const apiKey = String(req.body?.apiKey || "").trim();

  if (!site) {
    return res.status(404).json({ error: "unknown siteKey" });
  }
  if (site.apiKey && site.apiKey !== apiKey) {
    return res.status(403).json({ error: "invalid apiKey" });
  }
  const runtimeConfig = getRuntimeConfig(site.siteKey);
  if (runtimeConfig.trafficMode === "demo_only") {
    return res.status(409).json({ error: "site is currently set to demo_only mode" });
  }
  if (runtimeConfig.sampleRate < 100 && Math.random() * 100 > runtimeConfig.sampleRate) {
    return res.status(202).json({ ok: true, sampledOut: true });
  }

  const endpoint = String(req.body?.path || req.body?.endpoint || "/").trim() || "/";
  const method = String(req.body?.method || "GET").toUpperCase();
  const status = Number(req.body?.status || 200);
  const latency = Math.max(1, Number(req.body?.latency || randomBetween(40, 220)));
  const bytes = Math.max(0, Number(req.body?.bytes || randomBetween(250, 8000)));
  const userAgent = String(req.body?.userAgent || req.get("user-agent") || "Website-Client");
  const region = String(req.body?.region || pick(regionPool));
  const ip = String(req.body?.ip || req.ip || "");
  const threatSignals = detectThreatSignals({
    endpoint,
    userAgent,
    status,
    ip,
    blocked: status === 429,
  });
  const country = COUNTRY_BY_REGION[region] || pick(["United States", "Germany", "India", "Singapore"]);
  const asn = req.body?.asn || pick(ASN_POOL);

  const requestRecord = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    method,
    endpoint,
    status,
    latency,
    bytes,
    region,
    trace: `trc_${Math.random().toString(36).slice(2, 10)}`,
    agentName: userAgent,
    bot: threatSignals.bot,
    malicious: threatSignals.malicious,
    blocked: status === 429,
    illegalAttempt: threatSignals.illegalAttempt,
    warnings: threatSignals.warnings,
    siteKey: site.siteKey,
    siteName: site.name,
    siteDomain: site.domain,
    country,
    asn,
    sourceType: "live_browser",
    trustLevel: classifyTrust({
      bot: threatSignals.bot,
      malicious: threatSignals.malicious,
      illegalAttempt: threatSignals.illegalAttempt,
      blocked: status === 429,
      status,
    }),
  };

  recordRequest(requestRecord);

  if (requestRecord.blocked || requestRecord.malicious) {
    state.rateLimitEvents = [
      {
        id: crypto.randomUUID(),
        ts: requestRecord.ts,
        agentName: requestRecord.agentName,
        endpoint,
        status,
        action: requestRecord.blocked ? "rate-limited" : "flagged",
        siteName: site.name,
      },
      ...state.rateLimitEvents,
    ].slice(0, 24);
  }

  if (requestRecord.illegalAttempt || requestRecord.malicious) {
    logAudit("security.warning", `${site.name}: ${requestRecord.warnings.join(", ") || "Suspicious traffic detected"}`);
    triggerWebhookDeliveries(site.siteKey, {
      site: site.name,
      endpoint,
      warnings: requestRecord.warnings,
      severity: requestRecord.illegalAttempt ? "critical" : "warning",
    });
  }

  return res.status(202).json({
    ok: true,
    site: { siteKey: site.siteKey, name: site.name, domain: site.domain },
    trafficMode: runtimeConfig.trafficMode,
    classification: {
      bot: requestRecord.bot,
      malicious: requestRecord.malicious,
      illegalAttempt: requestRecord.illegalAttempt,
      warnings: requestRecord.warnings,
    },
  });
});

app.get("/api/metrics/realtime", (req, res) => {
  attachRealtimeClient(req, res, "snapshot", buildSnapshot());
});

app.get("/api/home/realtime", (req, res) => {
  attachRealtimeClient(req, res, "home", buildHomeSummary());
});

app.post("/api/insights", async (req, res) => {
  const metrics = sanitizeMetrics(req.body);

  try {
    if (!OPENAI_API_KEY) {
      return res.json(buildFallbackInsight(metrics));
    }

    return res.json(await generateOpenAIInsight(metrics));
  } catch (error) {
    console.error("Insight generation failed:", error.message);
    return res.json(buildFallbackInsight(metrics));
  }
});

app.post("/api/copilot", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  const snapshot = buildSnapshot();

  if (!question) {
    return res.status(400).json({ error: "question is required" });
  }

  try {
    if (!OPENAI_API_KEY) {
      return res.json(buildCopilotFallback(snapshot, question));
    }

    return res.json(await generateOpenAICopilot(snapshot, question));
  } catch (error) {
    console.error("Copilot generation failed:", error.message);
    return res.json(buildCopilotFallback(snapshot, question));
  }
});

app.post("/api/report", (req, res) => {
  const snapshot = buildSnapshot();
  const report = buildIncidentReport(snapshot);

  logAudit("report.generated", report.title);
  res.json(report);
});

app.get("/api/briefing-pack", (req, res) => {
  const snapshot = buildSnapshot();
  const pack = buildBriefingPack(snapshot);
  logAudit("briefing.generated", pack.missionStatus);
  res.json(pack);
});

app.get("/api/export/package", (req, res) => {
  const snapshot = buildSnapshot();
  const report = buildIncidentReport(snapshot);
  const briefingPack = buildBriefingPack(snapshot);

  logAudit("export.generated", "Incident bundle exported");
  res.json({
    title: "PulseOps Incident Bundle",
    generatedAt: new Date().toISOString(),
    snapshot,
    report,
    briefingPack,
  });
});

app.post("/api/demo/spike", (req, res) => {
  state.chaosUntil = Date.now() + 20000;
  logAudit("demo.spike", "Traffic spike triggered");
  res.json({ ok: true, until: state.chaosUntil });
});

app.post("/api/demo/scenario", (req, res) => {
  const requested = String(req.body?.scenario || "normal");
  if (!SCENARIOS[requested]) {
    return res.status(400).json({ error: "unknown scenario" });
  }

  state.scenario = requested;
  state.scenarioUntil = requested === "normal" ? 0 : Date.now() + 90000;
  if (requested !== "normal") {
    state.chaosUntil = Date.now() + 30000;
  }

  logAudit("demo.scenario", `Scenario changed to ${requested}`);
  return res.json({ ok: true, scenario: requested, until: state.scenarioUntil });
});

app.post("/api/query", (req, res) => {
  const query = String(req.body?.query || "").trim();
  const snapshot = buildSnapshot();
  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }

  logAudit("query.executed", query);
  return res.json(answerQuery(snapshot, query));
});

app.post("/api/prompt-studio", async (req, res) => {
  const input = normalizePromptStudioInput({
    brief: req.body?.brief,
    objective: req.body?.objective,
    audience: req.body?.audience,
    tone: req.body?.tone,
    outputFormat: req.body?.outputFormat,
    constraints: req.body?.constraints,
  });

  try {
    const result = OPENAI_API_KEY
      ? await generateOpenAIPromptStudio(input)
      : buildPromptStudioFallback(input);
    logAudit("prompt.generated", input.objective || "prompt studio");
    return res.json(result);
  } catch (error) {
    console.error("Prompt studio generation failed:", error.message);
    return res.json(buildPromptStudioFallback(input));
  }
});

app.all(DEMO_SIMULATION_ENDPOINTS, (req, res) => {
  const endpoint = req.path;
  const site = state.sites[0] || DEFAULT_SITE;
  const runtimeConfig = getRuntimeConfig(site.siteKey);
  if (!runtimeConfig.allowDemo || runtimeConfig.trafficMode === "live_only") {
    return res.status(204).send();
  }
  const { requestRecord, responseBody } = generateSimulatedDemoRequest(site, endpoint, req.method);

  setTimeout(() => {
    if (requestRecord.status === 204) {
      return res.status(requestRecord.status).end();
    }

    return res.status(requestRecord.status).json(responseBody);
  }, requestRecord.latency);
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "request body too large" });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "invalid json body" });
  }

  console.error("Unhandled backend error:", error?.message || error);
  return res.status(500).json({ error: "internal server error" });
});

app.listen(PORT, HOST, () => {
  console.log(`Backend running at http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(`Using database at ${DB_PATH}`);
});
