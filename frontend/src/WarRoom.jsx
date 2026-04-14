import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

function ActionButton({ children, onClick, tone = "default" }) {
  return (
    <button className={`copilot-submit quick-action quick-action--${tone}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

export default function WarRoom() {
  const [snapshot, setSnapshot] = useState(null);
  const [briefingPack, setBriefingPack] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [activityLabel, setActivityLabel] = useState("Ready");
  const [report, setReport] = useState(null);

  const checklist = useMemo(() => briefingPack?.operatorChecklist || [], [briefingPack]);
  const roleCards = useMemo(() => briefingPack?.roleCards || [], [briefingPack]);
  const promptCards = useMemo(() => briefingPack?.promptStarters || [], [briefingPack]);
  const demoFlow = useMemo(() => briefingPack?.demoFlow || [], [briefingPack]);
  const talkingPoints = useMemo(() => briefingPack?.talkingPoints || [], [briefingPack]);
  const replayMoments = useMemo(
    () => [
      `Scenario posture: ${snapshot?.scenarioLabel || "Normal Ops"}`,
      `Health score: ${snapshot?.totals?.healthScore ?? 100}/100`,
      `Threat score: ${snapshot?.threatScore ?? 0}/100`,
      report?.rootCause || "Root-cause summary will appear here after the backend responds.",
    ],
    [report, snapshot],
  );

  async function loadWarRoomAssets() {
    setActivityLabel("Refreshing");

    try {
      const [snapshotResponse, briefingResponse, reportResponse] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/snapshot`),
        fetch(`${API_BASE}/api/briefing-pack`),
        fetch(`${API_BASE}/api/report`, { method: "POST" }),
      ]);

      if (snapshotResponse.ok) {
        setSnapshot(await snapshotResponse.json());
      }

      if (briefingResponse.ok) {
        const nextPack = await briefingResponse.json();
        setBriefingPack(nextPack);
        setCheckedItems((previous) => {
          const updated = { ...previous };
          (nextPack.operatorChecklist || []).forEach((item) => {
            if (!(item in updated)) updated[item] = false;
          });
          return updated;
        });
      }

      if (reportResponse.ok) {
        setReport(await reportResponse.json());
      }

      setActivityLabel("Updated");
    } catch (error) {
      setActivityLabel("Offline");
    }
  }

  useEffect(() => {
    loadWarRoomAssets();
  }, []);

  const checklistProgress = useMemo(() => {
    if (!checklist.length) return 0;
    const completeCount = checklist.filter((item) => checkedItems[item]).length;
    return Math.round((completeCount / checklist.length) * 100);
  }, [checkedItems, checklist]);

  async function downloadIncidentBundle() {
    try {
      const response = await fetch(`${API_BASE}/api/export/package`);
      if (!response.ok) throw new Error("export failed");
      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "pulseops-incident-bundle.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setActivityLabel("Bundle downloaded");
    } catch (error) {
      setActivityLabel("Export failed");
    }
  }

  async function copyText(value, label) {
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setActivityLabel(label);
    } catch (error) {
      setActivityLabel("Clipboard unavailable");
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero war-room-hero">
        <div>
          <p className="eyebrow">Incident Operations</p>
          <h2>War Room</h2>
          <p className="page-hero__copy">
            A presentation-ready operations room with role briefings, demo talking points, exportable incident assets, and rapid-response playbooks.
          </p>
        </div>
        <div className="war-room-hero__meta">
          <div className="signal-pill signal-pill--info">
            <span>Status</span>
            <strong>{briefingPack?.missionStatus || activityLabel}</strong>
          </div>
          <div className="signal-pill signal-pill--success">
            <span>Checklist</span>
            <strong>{checklistProgress}%</strong>
          </div>
          <div className="signal-pill signal-pill--warning">
            <span>Scenario</span>
            <strong>{snapshot?.scenarioLabel || "Normal Ops"}</strong>
          </div>
        </div>
      </section>

      <section className="studio-grid">
        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Live command brief</p>
              <h2>Talking points</h2>
            </div>
            <span className="badge">{briefingPack?.source || "live"}</span>
          </div>
          <div className="report-card">
            <p>{briefingPack?.overview || "Loading current command brief..."}</p>
            <div className="report-actions">
              {talkingPoints.map((point) => (
                <div key={point} className="copilot-bullet">
                  <span className="insight-action__dot" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="resource-chip-row">
            {demoFlow.map((step) => (
              <span key={step} className="resource-chip">
                {step}
              </span>
            ))}
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Operator readiness</p>
              <h2>Runbook checklist</h2>
            </div>
          </div>
          <div className="checklist">
            {checklist.map((item) => (
              <label key={item} className="checklist-row">
                <input
                  checked={Boolean(checkedItems[item])}
                  onChange={() => setCheckedItems((previous) => ({ ...previous, [item]: !previous[item] }))}
                  type="checkbox"
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <div className="quick-actions">
            <ActionButton onClick={loadWarRoomAssets} tone="info">Refresh Briefing Pack</ActionButton>
            <ActionButton onClick={downloadIncidentBundle} tone="success">Download Incident Bundle</ActionButton>
          </div>
        </article>
      </section>

      <section className="briefing-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Role cards</p>
              <h2>Who says what</h2>
            </div>
          </div>
          <div className="resource-grid">
            {roleCards.map((card) => (
              <article key={card.role} className="resource-card resource-card--info">
                <div className="resource-card__tag">{card.role}</div>
                <h3>{card.title}</h3>
                <p>{card.brief}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel panel--insight">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Prompt launchers</p>
              <h2>Copy-ready AI prompts</h2>
            </div>
          </div>
          <div className="resource-grid">
            {promptCards.map((card) => (
              <article key={card.title} className="resource-card resource-card--warning">
                <div className="resource-card__tag">{card.tag}</div>
                <h3>{card.title}</h3>
                <p>{card.prompt}</p>
                <div className="quick-actions">
                  <ActionButton onClick={() => copyText(card.prompt, `${card.title} copied`)} tone="warning">
                    Copy Prompt
                  </ActionButton>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Presenter mode</p>
              <h2>Demo narration</h2>
            </div>
          </div>
          <div className="report-card">
            <p>{briefingPack?.demoNarration || "The system will generate a presentation narration once the backend responds."}</p>
          </div>
          <div className="quick-actions">
            <ActionButton
              onClick={() => copyText(briefingPack?.demoNarration || "", "Narration copied")}
              tone="default"
            >
              Copy Narration
            </ActionButton>
          </div>
        </article>

        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Export summary</p>
              <h2>Bundle contents</h2>
            </div>
          </div>
          <div className="resource-grid">
            {(briefingPack?.bundleContents || []).map((item) => (
              <article key={item.title} className="resource-card resource-card--success">
                <div className="resource-card__tag">{item.title}</div>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Incident replay</p>
              <h2>Replay storyboard</h2>
            </div>
          </div>
          <div className="report-actions">
            {replayMoments.map((item) => (
              <div key={item} className="copilot-bullet">
                <span className="insight-action__dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Postmortem</p>
              <h2>Lessons learned</h2>
            </div>
          </div>
          <div className="resource-grid">
            <article className="resource-card resource-card--success">
              <div className="resource-card__tag">What happened</div>
              <p>{report?.executiveSummary || "Waiting for the postmortem snapshot."}</p>
            </article>
            <article className="resource-card resource-card--warning">
              <div className="resource-card__tag">Likely cause</div>
              <p>{report?.rootCause || "No postmortem cause available yet."}</p>
            </article>
            <article className="resource-card resource-card--info">
              <div className="resource-card__tag">Action items</div>
              <p>Use the generated incident report, copilot actions, and operator checklist as your handoff-ready postmortem package.</p>
            </article>
          </div>
        </article>
      </section>
    </main>
  );
}
