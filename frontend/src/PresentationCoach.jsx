import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

const FALLBACK_QA = [
  {
    question: "What makes this different from a normal dashboard?",
    answer: "This platform interprets telemetry with AI, organizes incident response, and provides presentation-ready operational assets instead of only displaying charts.",
  },
  {
    question: "How is AI used in a practical way here?",
    answer: "AI is used for incident analysis, prompt generation, role-based briefings, and guided recommendations that are grounded in the live telemetry snapshot.",
  },
  {
    question: "Why is this project realistic?",
    answer: "It simulates a real SaaS workflow with sign-in, command center monitoring, war room response, executive summaries, and prompt tooling in one suite.",
  },
];

export default function PresentationCoach() {
  const [report, setReport] = useState(null);
  const [briefingPack, setBriefingPack] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    async function loadCoach() {
      try {
        const [snapshotResponse, reportResponse, briefingResponse] = await Promise.all([
          fetch(`${API_BASE}/api/dashboard/snapshot`),
          fetch(`${API_BASE}/api/report`, { method: "POST" }),
          fetch(`${API_BASE}/api/briefing-pack`),
        ]);

        if (snapshotResponse.ok) setSnapshot(await snapshotResponse.json());
        if (reportResponse.ok) setReport(await reportResponse.json());
        if (briefingResponse.ok) setBriefingPack(await briefingResponse.json());
      } catch (error) {
        // Quiet fallback for local presentation mode.
      }
    }

    loadCoach();
  }, []);

  const pitch = useMemo(() => {
    const scenarioLabel = snapshot?.scenarioLabel || "Normal Ops";
    const summary = report?.executiveSummary || "PulseOps is an AI-native command center for API reliability and threat visibility.";
    return [
      "PulseOps Platform Suite is my capstone project, designed as an AI-powered operations workspace rather than a simple dashboard.",
      `Right now the platform is in ${scenarioLabel}, and it combines observability, incident response, prompt tooling, and executive communication in one product.`,
      summary,
      "What makes it unique is that it turns telemetry into action through copilots, guided workflows, exportable reports, and role-based operational views.",
    ];
  }, [report, snapshot]);

  const checkpoints = [
    "Start from the login screen to frame it as a real platform product.",
    "Open the Command Center and explain live telemetry, AI analysis, and threat posture.",
    "Switch to War Room to show operational workflow, role briefings, and export readiness.",
    "Use Prompt Studio to demonstrate natural-language prompt generation.",
    "Close with Executive Suite or Blueprint depending on whether the question is business or technical.",
  ];

  const judgeAngles = useMemo(() => {
    if (!briefingPack) return FALLBACK_QA;

    return [
      {
        question: "How would you present the business value?",
        answer: briefingPack.roleCards?.find((card) => card.role === "Executive")?.brief || FALLBACK_QA[0].answer,
      },
      {
        question: "How would you explain the incident workflow?",
        answer: briefingPack.roleCards?.find((card) => card.role === "Commander")?.brief || FALLBACK_QA[1].answer,
      },
      {
        question: "How does the platform support AI operations?",
        answer: briefingPack.overview || FALLBACK_QA[2].answer,
      },
    ];
  }, [briefingPack]);

  function speakPitch() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(pitch.join(" "));
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function stopPitch() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Presentation Toolkit</p>
          <h2>Presentation Coach</h2>
          <p className="page-hero__copy">
            Practice your story, tighten your demo flow, and prepare for classroom or judge questions with a cleaner capstone narrative.
          </p>
        </div>
      </section>

      <section className="studio-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Pitch</p>
              <h2>90-second story</h2>
            </div>
            <div className="quick-actions">
              <button className="copilot-submit" onClick={speaking ? stopPitch : speakPitch} type="button">
                {speaking ? "Stop Voice Mode" : "Voice Presentation Mode"}
              </button>
            </div>
          </div>
          <div className="report-actions">
            {pitch.map((item) => (
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
              <p className="eyebrow">Flow</p>
              <h2>Demo checkpoints</h2>
            </div>
          </div>
          <div className="checklist">
            {checkpoints.map((item) => (
              <div key={item} className="checklist-row">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel--alerts">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Q&amp;A Prep</p>
              <h2>Likely professor questions</h2>
            </div>
          </div>
          <div className="resource-grid">
            {judgeAngles.map((item) => (
              <article key={item.question} className="resource-card resource-card--warning">
                <div className="resource-card__tag">Question</div>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel panel--insight">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Positioning</p>
              <h2>How to frame the project</h2>
            </div>
          </div>
          <div className="resource-grid">
            <article className="resource-card resource-card--info">
              <div className="resource-card__tag">Technical angle</div>
              <p>Frame it as an AI-powered operational platform that unifies telemetry, threat analysis, incident coordination, and prompt engineering.</p>
            </article>
            <article className="resource-card resource-card--success">
              <div className="resource-card__tag">Product angle</div>
              <p>Explain that it feels like a full SaaS suite because it includes identity, workflows, multiple role-based pages, guided actions, and reporting.</p>
            </article>
            <article className="resource-card resource-card--warning">
              <div className="resource-card__tag">Capstone angle</div>
              <p>Present it as a practical demonstration of how AI can turn raw system telemetry into useful operational guidance and business communication.</p>
            </article>
            <article className="resource-card resource-card--info">
              <div className="resource-card__tag">Narrator mode</div>
              <p>Use the built-in voice presentation mode if you want the system to rehearse the pitch out loud before your demo.</p>
            </article>
          </div>
        </article>
      </section>
    </main>
  );
}
