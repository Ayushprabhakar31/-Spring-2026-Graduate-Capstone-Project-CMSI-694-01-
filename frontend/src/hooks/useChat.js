import { useEffect, useRef, useState } from "react";

const CHAT_MEMORY_KEY = "pulseops_chat_memory";
const INITIAL_MESSAGE = { id: "intro", role: "assistant", title: "PulseOps Assistant", body: "Ask about latency, root cause, customer impact, or next steps." };

function loadMessages() {
  try { const saved = window.localStorage.getItem(CHAT_MEMORY_KEY); return saved ? JSON.parse(saved) : [INITIAL_MESSAGE]; }
  catch { return [INITIAL_MESSAGE]; }
}

export default function useChat() {
  const [messages, setMessages] = useState(() => loadMessages());
  const bottomRef = useRef(null);
  useEffect(() => {
    try { window.localStorage.setItem(CHAT_MEMORY_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  function addMessage(message) { setMessages((c) => [...c, message]); }
  function clearMessages() { setMessages([INITIAL_MESSAGE]); }
  return { messages, addMessage, clearMessages, bottomRef };
}
