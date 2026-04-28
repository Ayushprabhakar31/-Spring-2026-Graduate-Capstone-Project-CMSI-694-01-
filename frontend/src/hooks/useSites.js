import { useEffect, useState } from "react";
import * as api from "../services/api";

export default function useSites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSites() {
      try {
        const data = await api.getSites();
        if (!cancelled) {
          setSites(Array.isArray(data?.rows) ? data.rows : []);
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

    setLoading(true);
    loadSites().catch(() => {});
    const intervalId = window.setInterval(() => {
      loadSites().catch(() => {});
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return { sites, loading, error };
}
