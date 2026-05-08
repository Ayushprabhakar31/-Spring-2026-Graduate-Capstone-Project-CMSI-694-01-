import { API_BASE } from "../config";
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  if (!response.ok) { const error = new Error(`API error ${response.status}`); error.status = response.status; throw error; }
  if (response.status === 204) return null;
  return response.json();
}
export const getSnapshot = () => request("/api/dashboard/snapshot");
export const getHomeSummary = () => request("/api/home/summary");
export const getSites = () => request("/api/sites");
export const getSiteOverview = (siteKey) => request(`/api/sites/${encodeURIComponent(siteKey)}/overview`);
export const rotateSiteKey = (siteKey) => request(`/api/sites/${encodeURIComponent(siteKey)}/rotate-key`, { method: "POST" });
export const createSite = (body) => request("/api/sites/register", { method: "POST", body: JSON.stringify(body) });
export const getEdgeConfig = (siteKey) => request(`/api/sites/${encodeURIComponent(siteKey)}/edge-config`);
export const updateEdgeConfig = (siteKey, body) => request(`/api/sites/${encodeURIComponent(siteKey)}/edge-config`, { method: "POST", body: JSON.stringify(body) });
export const getRuntimeConfig = (siteKey) => request(`/api/sites/${encodeURIComponent(siteKey)}/runtime-config`);
export const updateRuntimeConfig = (siteKey, body) => request(`/api/sites/${encodeURIComponent(siteKey)}/runtime-config`, { method: "POST", body: JSON.stringify(body) });
export const login = (body) => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) });
export const register = (body) => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) });
export const checkHealth = () => fetch(`${API_BASE}/health`).then((r) => r.ok);
export const postCopilot = (body) => request("/api/copilot", { method: "POST", body: JSON.stringify(body) });
export const generateReport = () => request("/api/report", { method: "POST" });
export const getBriefingPack = () => request("/api/briefing-pack");
export const shareReport = () => request("/api/share/report", { method: "POST" });
export const getAdminOverview = () => request("/api/admin/overview");
export const createWebhook = (body) => request("/api/webhooks", { method: "POST", body: JSON.stringify(body) });
export const ingestLog = (body) => request("/api/logs/ingest", { method: "POST", body: JSON.stringify(body) });
export const getAutomationOverview = () => request("/api/automation/overview");
export const createAutomationRule = (body) => request("/api/automation/rules", { method: "POST", body: JSON.stringify(body) });
export const updateAutomationRule = (ruleId, body) => request(`/api/automation/rules/${encodeURIComponent(ruleId)}`, { method: "POST", body: JSON.stringify(body) });
export const evaluateAutomationRules = () => request("/api/automation/evaluate", { method: "POST" });
export const getHistoryOverview = (siteKey) => request(siteKey ? `/api/history/overview?siteKey=${encodeURIComponent(siteKey)}` : "/api/history/overview");
export const getIncidentComparison = () => request("/api/history/incidents/compare");
export const collectRequest = (body) => request("/api/collect", { method: "POST", body: JSON.stringify(body) });
export const generatePrompt = (body) => request("/api/prompt-studio", { method: "POST", body: JSON.stringify(body) });
