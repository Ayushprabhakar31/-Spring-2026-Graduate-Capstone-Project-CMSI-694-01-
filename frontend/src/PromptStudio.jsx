import { useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

const PRESETS = [
  {
    label: "Incident Commander",
    brief:
      "Create a prompt for an incident commander who needs to coordinate an API outage, assign owners, and decide the next 15 minutes of response.",
    values: {
      objective: "coordinate an API incident response",
      audience: "incident commander",
      tone: "decisive and operational",
      outputFormat: "bullet-point runbook",
      constraints: "prioritize evidence, ownership, and immediate actions",
    },
  },
  {
    label: "Security Analyst",
    brief:
      "Generate a prompt for a security analyst investigating bot traffic, 429 spikes, and possible malicious automation on the API gateway.",
    values: {
      objective: "analyze bot attacks and rate-limit behavior",
      audience: "security analyst",
      tone: "forensic and precise",
      outputFormat: "structured investigation notes",
      constraints: "separate malicious indicators from assumptions",
    },
  },
  {
    label: "Executive Brief",
    brief:
      "Write a prompt that turns a technical platform incident into a simple executive memo focused on customer impact, business risk, and next steps.",
    values: {
      objective: "summarize business impact from a platform incident",
      audience: "executive stakeholder",
      tone: "clear and concise",
      outputFormat: "executive summary memo",
      constraints: "translate technical risk into customer and revenue impact",
    },
  },
];

const NATURAL_LANGUAGE_EXAMPLES = [
  "Create a prompt for an SRE who needs to explain why latency spiked and what the on-call engineer should do next.",
  "I need a security investigation prompt about malicious bots hitting auth endpoints and triggering rate limits.",
  "Generate an executive prompt that explains outage impact in plain English for leadership.",
  "Build a runbook-style AI prompt for diagnosing dependency failures in the orders API.",
];

export default function PromptStudio() {
  const [form, setForm] = useState(PRESETS[0].values);
  const [brief, setBrief] = useState(PRESETS[0].brief);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  async function copyText(value, label) {
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setCopyStatus(label);
    } catch (error) {
      setCopyStatus("Clipboard unavailable");
    }
  }

  async function generatePrompt(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/prompt-studio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, brief }),
      });

      if (!response.ok) {
        throw new Error(`Prompt generation failed with ${response.status}`);
      }

      setResult(await response.json());
    } catch (error) {
      setResult({
        title: "Prompt generation unavailable",
        parsedBrief: {
          brief,
          ...form,
        },
        systemPrompt: "The prompt studio could not reach the backend.",
        userPrompt: "Retry after confirming the backend is running.",
        evaluationChecklist: ["Backend reachable", "Fields are populated", "Prompt is specific", "Output format is clear"],
        suggestedAgents: [],
        starterPrompts: [],
        source: "fallback",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">AI Tooling</p>
          <h2>Prompt Studio</h2>
          <p className="page-hero__copy">
            Build production-ready prompts for incident command, threat analysis, executive reporting, and response automation.
          </p>
        </div>
        <div className="resource-chip-row">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="copilot-chip"
              onClick={() => {
                setForm(preset.values);
                setBrief(preset.brief);
              }}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="studio-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Natural Language</p>
              <h2>Prompt builder</h2>
              <p className="page-hero__copy prompt-studio__helper">
                Easiest path: write one sentence in plain English, then click `Generate Prompt Kit`. The fields below are optional refinements if you want more control.
              </p>
            </div>
          </div>
          <form className="form-grid" onSubmit={generatePrompt}>
            <label className="field field--full">
              <span>Describe what you want in plain English</span>
              <textarea
                className="prompt-brief"
                placeholder="Example: Create a prompt for an incident commander who needs to explain a latency spike, identify the most likely root cause, and recommend the next three actions."
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Objective</span>
              <input value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} />
            </label>
            <label className="field">
              <span>Audience</span>
              <input value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} />
            </label>
            <label className="field">
              <span>Tone</span>
              <input value={form.tone} onChange={(event) => setForm({ ...form, tone: event.target.value })} />
            </label>
            <label className="field">
              <span>Output format</span>
              <input value={form.outputFormat} onChange={(event) => setForm({ ...form, outputFormat: event.target.value })} />
            </label>
            <label className="field field--full">
              <span>Constraints</span>
              <textarea value={form.constraints} onChange={(event) => setForm({ ...form, constraints: event.target.value })} />
            </label>
            <div className="field field--full">
              <span>Natural language ideas</span>
              <div className="resource-chip-row">
                {NATURAL_LANGUAGE_EXAMPLES.map((example) => (
                  <button key={example} className="copilot-chip" onClick={() => setBrief(example)} type="button">
                    {example}
                  </button>
                ))}
              </div>
            </div>
            <button className="copilot-submit" type="submit">
              {loading ? "Generating..." : "Generate Prompt Kit"}
            </button>
          </form>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Output</p>
              <h2>Prompt pack</h2>
            </div>
            <span className="badge">{result?.source || "ready"}</span>
          </div>
          {result ? (
            <div className="prompt-pack">
              <div className="quick-actions">
                <button className="copilot-submit" onClick={() => copyText(result.systemPrompt, "System prompt copied")} type="button">
                  Copy System Prompt
                </button>
                <button className="pause-button" onClick={() => copyText(result.userPrompt, "User prompt copied")} type="button">
                  Copy User Prompt
                </button>
                {copyStatus ? <span className="badge">{copyStatus}</span> : null}
              </div>
              <div className="resource-card resource-card--info">
                <div className="resource-card__tag">Interpreted brief</div>
                <div className="briefing-grid__cards">
                  <div className="copilot-bullet">
                    <span className="insight-action__dot" />
                    <span><strong>Brief:</strong> {result.parsedBrief?.brief}</span>
                  </div>
                  <div className="copilot-bullet">
                    <span className="insight-action__dot" />
                    <span><strong>Audience:</strong> {result.parsedBrief?.audience}</span>
                  </div>
                  <div className="copilot-bullet">
                    <span className="insight-action__dot" />
                    <span><strong>Tone:</strong> {result.parsedBrief?.tone}</span>
                  </div>
                  <div className="copilot-bullet">
                    <span className="insight-action__dot" />
                    <span><strong>Format:</strong> {result.parsedBrief?.outputFormat}</span>
                  </div>
                </div>
              </div>
              <div className="code-card">
                <strong>System Prompt</strong>
                <pre>{result.systemPrompt}</pre>
              </div>
              <div className="code-card">
                <strong>User Prompt</strong>
                <pre>{result.userPrompt}</pre>
              </div>
              <div className="resource-card resource-card--success">
                <div className="resource-card__tag">Evaluation checklist</div>
                <div className="report-actions">
                  {result.evaluationChecklist?.map((item) => (
                    <div key={item} className="copilot-bullet">
                      <span className="insight-action__dot" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="resource-grid">
                {result.suggestedAgents?.map((agent) => (
                  <article key={agent.name} className="resource-card resource-card--info">
                    <div className="resource-card__tag">{agent.name}</div>
                    <p>{agent.purpose}</p>
                  </article>
                ))}
              </div>
              <div className="resource-card resource-card--warning">
                <div className="resource-card__tag">Starter prompts</div>
                <div className="report-actions">
                  {result.starterPrompts?.map((item) => (
                    <div key={item} className="copilot-bullet">
                      <span className="insight-action__dot" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="alert-card alert-card--info">
              <strong>No prompt generated yet</strong>
              <p>Describe your need in plain English and the studio will turn it into a copy-ready AI prompt kit.</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
