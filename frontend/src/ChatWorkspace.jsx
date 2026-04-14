import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";
const CHAT_MEMORY_KEY = "pulseops_chat_memory";

const STARTERS = [
  "Summarize the current incident posture in simple language.",
  "Which endpoint is failing the most and why?",
  "What should the on-call engineer do in the next 15 minutes?",
  "Explain the current business impact for leadership.",
];

export default function ChatWorkspace() {
  const [input, setInput] = useState(STARTERS[0]);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }
    const saved = window.localStorage.getItem(CHAT_MEMORY_KEY);
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: "intro",
            role: "assistant",
            title: "PulseOps Assistant",
            body: "Ask about latency, root cause, customer impact, or next steps. This workspace turns the incident copilot into a more conversational AI chat surface.",
          },
        ];
  });

  const tips = useMemo(
    () => [
      "Use this page when you want a back-and-forth AI explanation instead of dashboard cards.",
      "Start with business-facing questions if you are presenting to non-technical judges.",
      "Use the Prompt Studio when you need reusable prompts; use this page when you need direct answers.",
    ],
    [],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CHAT_MEMORY_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  async function sendMessage(question) {
    const trimmed = question.trim();
    if (!trimmed) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      title: "You",
      body: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setLoading(true);
    setInput("");

    try {
      const response = await fetch(`${API_BASE}/api/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `${trimmed}\n\nRecent chat memory: ${messages.slice(-4).map((item) => `${item.role}: ${item.body}`).join(" | ")}`,
        }),
      });

      if (!response.ok) throw new Error(`Copilot request failed with ${response.status}`);
      const data = await response.json();

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          title: data.source === "openai" ? "OpenAI Copilot" : "Telemetry Copilot",
          body: data.answer,
          bullets: data.bullets || [],
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          title: "Copilot Fallback",
          body: "The chat workspace could not reach the AI endpoint, so the response is unavailable right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Conversational AI</p>
          <h2>Chat Workspace</h2>
          <p className="page-hero__copy">
            A full chatbot surface for conversational incident analysis, business framing, and operational guidance powered by the same PulseOps copilot.
          </p>
        </div>
      </section>

      <section className="studio-grid">
        <article className="panel panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Assistant</p>
              <h2>Live AI conversation</h2>
            </div>
            <button className="topbar__logout" onClick={() => setMessages([])} type="button">Clear Memory</button>
          </div>
          <div className="chat-thread">
            {messages.map((message) => (
              <div key={message.id} className={`chat-message chat-message--${message.role}`}>
                <div className="chat-message__title">{message.title}</div>
                <p>{message.body}</p>
                {message.bullets?.length ? (
                  <div className="report-actions">
                    {message.bullets.map((bullet) => (
                      <div key={bullet} className="copilot-bullet">
                        <span className="insight-action__dot" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <form
            className="copilot-form"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
          >
            <textarea
              className="copilot-input"
              placeholder="Ask a question about the current incident, customer impact, or next actions."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <div className="copilot-actions">
              {STARTERS.map((starter) => (
                <button key={starter} className="copilot-chip" onClick={() => setInput(starter)} type="button">
                  {starter}
                </button>
              ))}
            </div>
            <button className="copilot-submit" type="submit">
              {loading ? "Thinking..." : "Send Message"}
            </button>
          </form>
        </article>

        <article className="panel panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">How to use it</p>
              <h2>Conversation tips</h2>
            </div>
          </div>
          <div className="resource-grid">
            {tips.map((tip) => (
              <article key={tip} className="resource-card resource-card--info">
                <p>{tip}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
