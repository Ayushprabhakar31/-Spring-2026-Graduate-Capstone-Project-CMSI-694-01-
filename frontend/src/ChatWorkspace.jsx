import { useMemo, useState } from "react";
import * as api from "./services/api";
import useChat from "./hooks/useChat";

const STARTERS = [
  "Summarize the current incident posture in simple language.",
  "Which endpoint is failing the most and why?",
  "What should the on-call engineer do in the next 15 minutes?",
  "Explain the current business impact for leadership.",
];

export default function ChatWorkspace() {
  const [input, setInput] = useState(STARTERS[0]);
  const [loading, setLoading] = useState(false);
  const { messages, addMessage, clearMessages, bottomRef } = useChat();

  const tips = useMemo(
    () => [
      "Use this page when you want a back-and-forth AI explanation instead of dashboard cards.",
      "Start with business-facing questions if you are presenting to non-technical judges.",
      "Use the Prompt Studio when you need reusable prompts; use this page when you need direct answers.",
    ],
    [],
  );

  async function sendMessage(question) {
    const trimmed = question.trim();
    if (!trimmed) return;

    addMessage({ id: `user-${Date.now()}`, role: "user", title: "You", body: trimmed });
    setLoading(true);
    setInput("");

    try {
      const data = await api.postCopilot({
        question: `${trimmed}\n\nRecent chat memory: ${messages.slice(-4).map((m) => `${m.role}: ${m.body}`).join(" | ")}`,
      });

      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        title: data.source === "openai" ? "OpenAI Copilot" : "Telemetry Copilot",
        body: data.answer,
        bullets: data.bullets || [],
      });
    } catch {
      addMessage({
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        title: "Copilot Fallback",
        body: "The chat workspace could not reach the AI endpoint, so the response is unavailable right now.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell chat-workspace">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Conversational AI</p>
          <h2>Chat Workspace</h2>
          <p className="page-hero__copy">
            A full chatbot surface for conversational incident analysis, business framing, and operational guidance powered by the same PulseOps copilot.
          </p>
        </div>
      </section>

      <section className="studio-grid chat-workspace__grid">
        <article className="panel panel--copilot chat-workspace__panel chat-workspace__panel--copilot">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Assistant</p>
              <h2>Live AI conversation</h2>
            </div>
            <button className="topbar__logout" onClick={clearMessages} type="button">Clear Memory</button>
          </div>
          <div className="chat-thread chat-workspace__thread">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message chat-message--${message.role} chat-workspace__message chat-workspace__message--${message.role}`}
              >
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
            <div ref={bottomRef} />
          </div>
          <form
            className="copilot-form chat-workspace__form"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
          >
            <textarea
              className="copilot-input chat-workspace__input"
              placeholder="Ask a question about the current incident, customer impact, or next actions."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <div className="copilot-actions chat-workspace__chips">
              {STARTERS.map((starter) => (
                <button key={starter} className="copilot-chip chat-workspace__chip" onClick={() => setInput(starter)} type="button">
                  {starter}
                </button>
              ))}
            </div>
            <button className="copilot-submit chat-workspace__submit" type="submit">
              {loading ? "Thinking..." : "Send Message"}
            </button>
          </form>
        </article>

        <article className="panel panel--resources chat-workspace__panel chat-workspace__panel--resources">
          <div className="panel__header">
            <div>
              <p className="eyebrow">How to use it</p>
              <h2>Conversation tips</h2>
            </div>
          </div>
          <div className="resource-grid chat-workspace__tips">
            {tips.map((tip) => (
              <article key={tip} className="resource-card resource-card--info chat-workspace__tip-card">
                <p>{tip}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
