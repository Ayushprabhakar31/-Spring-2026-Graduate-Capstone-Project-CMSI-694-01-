import { useEffect, useRef, useState } from "react";
import { getSnapshot } from "../services/api";
import { API_BASE } from "../config";

export default function useSnapshot() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamStatus, setStreamStatus] = useState("connecting");
  const pollingRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      try {
        const data = await getSnapshot();
        if (!cancelled) {
          setSnapshot(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    function startPolling() {
      if (pollingRef.current) return;
      setStreamStatus("polling");
      pollingRef.current = window.setInterval(() => {
        loadSnapshot().catch(() => {});
      }, 5000);
    }

    function stopPolling() {
      if (!pollingRef.current) return;
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    loadSnapshot().catch(() => {});

    let eventSource = null;
    if (typeof EventSource === "function") {
      try {
        eventSource = new EventSource(`${API_BASE}/api/metrics/realtime`);
        eventSource.addEventListener("connected", () => {
          if (cancelled) return;
          setStreamStatus("live");
          stopPolling();
        });
        eventSource.addEventListener("snapshot", (event) => {
          if (cancelled) return;
          try {
            setSnapshot(JSON.parse(event.data));
            setError(null);
            setLoading(false);
            setStreamStatus("live");
            stopPolling();
          } catch (err) {
            setError("Unable to parse live snapshot");
          }
        });
        eventSource.onerror = () => {
          if (cancelled) return;
          startPolling();
        };
      } catch (err) {
        startPolling();
      }
    } else {
      startPolling();
    }

    return () => {
      cancelled = true;
      eventSource?.close();
      stopPolling();
    };
  }, []);

  return { snapshot, loading, error, streamStatus };
}
