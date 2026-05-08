const REMOTE_API_BASE = "https://pulseops-ayush-backend.fly.dev";

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function resolveApiBase() {
  if (process.env.REACT_APP_API_BASE) return process.env.REACT_APP_API_BASE;

  if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
    return "http://localhost:9000";
  }

  return REMOTE_API_BASE;
}

export const API_BASE = resolveApiBase();
