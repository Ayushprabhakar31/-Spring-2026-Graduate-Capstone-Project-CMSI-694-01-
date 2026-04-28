import { useEffect, useState } from "react";
import * as api from "../services/api";

export default function useBriefingPack() {
  const [briefingPack, setBriefingPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBriefingPack() {
      try {
        const data = await api.getBriefingPack();
        if (!cancelled) {
          setBriefingPack(data);
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

    loadBriefingPack().catch(() => {});
    const intervalId = window.setInterval(() => {
      loadBriefingPack().catch(() => {});
    }, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return { briefingPack, loading, error };
}
