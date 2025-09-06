import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { baseUrl } from "../components/constant/constant";

function sumNumbers(obj) {
  if (!obj || typeof obj !== "object") return 0;
  return Object.values(obj).reduce((acc, v) => {
    if (typeof v === "number" && !Number.isNaN(v)) return acc + v;
    if (v && typeof v === "object") return acc + sumNumbers(v);
    return acc;
  }, 0);
}

export default function useTotalScore(uuid) {
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTotal = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    setError(null);
    try {
      // EXPECTED: GET /api/asian-paint/score/total?uuid=XYZ -> { total: number }
      const res = await axios.get(`${baseUrl}/api/asian-paint/score/total`, {
        params: { uuid },
      });

      let t = 0;
      if (res.data?.total != null) {
        t = Number(res.data.total) || 0;
      } else if (res.data?.user?.score) {
        // fallback if your API returns user -> score tree
        t = sumNumbers(res.data.user.score);
      } else if (Array.isArray(res.data?.scores)) {
        t = res.data.scores.reduce((a, b) => a + (Number(b) || 0), 0);
      }
      setTotal(t);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  // fetch on mount / when uuid changes
  useEffect(() => {
    fetchTotal();
  }, [fetchTotal]);

  // allow other parts of the app to say “scores changed”
  useEffect(() => {
    const onScoreChanged = () => fetchTotal();
    window.addEventListener("score:changed", onScoreChanged);
    return () => window.removeEventListener("score:changed", onScoreChanged);
  }, [fetchTotal]);

  return { total, loading, error, refresh: fetchTotal, setTotal };
}
