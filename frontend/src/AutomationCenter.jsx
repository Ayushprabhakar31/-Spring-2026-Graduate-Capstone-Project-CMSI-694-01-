import { useEffect, useMemo, useState } from "react";
import * as api from "./services/api";

const INITIAL_FORM = {
  name: "",
  siteKey: "",
  metricKey: "site_risk_score",
  comparator: "gte",
  thresholdValue: 60,
  actionType: "edge_lockdown",
  cooldownSeconds: 300,
  note: "",
};

function RuleCard({ rule, onToggle }) {
  return (
    <div className={`service-row ${rule.enabled ? "service-row--success" : "service-row--warning"}`}>
      <div>
        <strong>{rule.name}</strong>
        <span>
          {rule.siteKey ? `Scoped to ${rule.siteKey}` : "Applies across the workspace"} · {rule.metricKey} {rule.comparator} {rule.thresholdValue}
        </span>
        <span>
          {rule.actionType} · cooldown {rule.cooldownSeconds}s · {rule.lastTriggeredAt ? `last fired ${new Date(rule.lastTriggeredAt).toLocaleString()}` : "not fired yet"}
        </span>
      </div>
      <button className="copilot-submit" onClick={() => onToggle(rule)} type="button">
        {rule.enabled ? "Pause Rule" : "Enable Rule"}
      </button>
    </div>
  );
}

export default function AutomationCenter() {
  const [overview, setOverview] = useState({ rules: [], runs: [], sites: [], catalogs: { metrics: [], comparators: [], actions: [] } });
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  async function loadOverview() {
    try {
      const data = await api.getAutomationOverview();
      setOverview(data);
    } catch {
      // quiet for local demo
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const healthyRules = useMemo(() => overview.rules.filter((rule) => rule.enabled).length, [overview.rules]);
  const recentRuns = useMemo(() => overview.runs.slice(0, 8), [overview.runs]);

  async function handleCreateRule(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.createAutomationRule({
        ...form,
        siteKey: form.siteKey || "",
        thresholdValue: Number(form.thresholdValue),
        cooldownSeconds: Number(form.cooldownSeconds),
        actionConfig: form.note.trim() ? { note: form.note.trim() } : {},
      });
      setForm(INITIAL_FORM);
      loadOverview();
    } catch {
      // quiet for local demo
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRule(rule) {
    try {
      await api.updateAutomationRule(rule.id, { enabled: !rule.enabled });
      loadOverview();
    } catch {
      // quiet for local demo
    }
  }

  async function handleRunNow() {
    setRunning(true);
    try {
      await api.evaluateAutomationRules();
      loadOverview();
    } catch {
      // quiet for local demo
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Automation Layer</p>
          <h2>Automation Center</h2>
          <p className="page-hero__copy">
            Turn PulseOps into an active operator by defining rules that react to risk, latency, blocked traffic, and threat posture with webhooks, edge controls, playbooks, and shared reports.
          </p>
        </div>
      </section>

      <section className="sla-grid">
        <div className="sla-card">
          <span>Enabled rules</span>
          <strong>{healthyRules}</strong>
          <p>Active automations monitoring the workspace right now.</p>
        </div>
        <div className="sla-card">
          <span>Total rules</span>
          <strong>{overview.rules.length}</strong>
          <p>Persisted rules across site-specific and global scopes.</p>
        </div>
        <div className="sla-card">
          <span>Recent runs</span>
          <strong>{overview.runs.length}</strong>
          <p>Latest automation triggers recorded in the backend.</p>
        </div>
        <div className="sla-card">
          <span>Manual evaluation</span>
          <strong>Ready</strong>
          <p>Run the current rule set instantly to validate thresholds.</p>
        </div>
      </section>

      <section className="studio-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">New rule</p>
              <h2>Create an automation</h2>
            </div>
          </div>
          <form className="site-form" onSubmit={handleCreateRule}>
            <input
              className="copilot-input query-input"
              placeholder="Rule name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <select className="site-select" value={form.siteKey} onChange={(event) => setForm((current) => ({ ...current, siteKey: event.target.value }))}>
              <option value="">All sites / global</option>
              {overview.sites.map((site) => (
                <option key={site.siteKey} value={site.siteKey}>{site.name}</option>
              ))}
            </select>
            <select className="site-select" value={form.metricKey} onChange={(event) => setForm((current) => ({ ...current, metricKey: event.target.value }))}>
              {overview.catalogs.metrics.map((metric) => (
                <option key={metric.id} value={metric.id}>{metric.label}</option>
              ))}
            </select>
            <select className="site-select" value={form.comparator} onChange={(event) => setForm((current) => ({ ...current, comparator: event.target.value }))}>
              {overview.catalogs.comparators.map((comparator) => (
                <option key={comparator.id} value={comparator.id}>{comparator.label}</option>
              ))}
            </select>
            <input
              className="copilot-input query-input"
              min="0"
              placeholder="Threshold"
              type="number"
              value={form.thresholdValue}
              onChange={(event) => setForm((current) => ({ ...current, thresholdValue: event.target.value }))}
            />
            <select className="site-select" value={form.actionType} onChange={(event) => setForm((current) => ({ ...current, actionType: event.target.value }))}>
              {overview.catalogs.actions.map((action) => (
                <option key={action.id} value={action.id}>{action.label}</option>
              ))}
            </select>
            <input
              className="copilot-input query-input"
              min="60"
              placeholder="Cooldown seconds"
              type="number"
              value={form.cooldownSeconds}
              onChange={(event) => setForm((current) => ({ ...current, cooldownSeconds: event.target.value }))}
            />
            <textarea
              className="code-block-input"
              placeholder="Optional note for alerts or action context"
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            />
            <div className="quick-actions">
              <button className="copilot-submit" disabled={saving} type="submit">
                {saving ? "Creating..." : "Create Automation"}
              </button>
              <button className="topbar__mark" disabled={running} onClick={handleRunNow} type="button">
                {running ? "Running..." : "Run Rules Now"}
              </button>
            </div>
          </form>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Rule library</p>
              <h2>Current automation rules</h2>
            </div>
          </div>
          <div className="service-list">
            {overview.rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} onToggle={handleToggleRule} />
            ))}
            {!overview.rules.length ? <p className="page-hero__copy">No automation rules yet.</p> : null}
          </div>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Run history</p>
              <h2>Recent automation triggers</h2>
            </div>
          </div>
          <div className="service-list">
            {recentRuns.map((run) => (
              <div key={run.id} className={`service-row ${run.status === "success" ? "service-row--success" : "service-row--warning"}`}>
                <div>
                  <strong>{run.ruleName}</strong>
                  <span>{run.metricKey} observed {run.metricValue} · {run.actionType}</span>
                  <span>{new Date(run.triggeredAt).toLocaleString()}</span>
                </div>
                <div className="service-row__status">{run.status}</div>
              </div>
            ))}
            {!recentRuns.length ? <p className="page-hero__copy">Automation history will appear here after the first trigger.</p> : null}
          </div>
        </article>

        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Recommended uses</p>
              <h2>Best-fit automations for this project</h2>
            </div>
          </div>
          <div className="resource-grid">
            <div className="resource-card resource-card--warning">
              <div className="resource-card__tag">Threat Response</div>
              <h3>Auto-tighten edge posture</h3>
              <p>Escalate from balanced to strict when site risk or blocked requests surge.</p>
            </div>
            <div className="resource-card resource-card--info">
              <div className="resource-card__tag">Operator Alerts</div>
              <h3>Deliver webhook notifications</h3>
              <p>Broadcast high-severity posture changes to Slack, Discord, or shared channels.</p>
            </div>
            <div className="resource-card resource-card--success">
              <div className="resource-card__tag">Reporting</div>
              <h3>Generate playbooks and reports</h3>
              <p>Create response guidance and shareable artifacts without waiting for manual clicks.</p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
