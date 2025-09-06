import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { baseUrl } from "../components/constant/constant";

const sumNumbers = (obj) => {
  if (!obj || typeof obj !== "object") return 0;
  return Object.values(obj).reduce((acc, v) => {
    if (typeof v === "number" && !Number.isNaN(v)) return acc + v;
    if (v && typeof v === "object") return acc + sumNumbers(v);
    return acc;
  }, 0);
};

/**
 * Pulls detailed score for user from API.
 * Expected API: GET /api/asian-paint/score/detail?uuid=UUID -> { score: {...} }
 * Fallback: accept { user: { score } } or compute from array.
 */
export default function useUserScores(uuid, initialScore) {
  const [score, setScore] = useState(initialScore || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchScores = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${baseUrl}/api/asian-paint/score/detail`, {
        params: { uuid },
      });

      let s = {};
      if (res.data?.score) s = res.data.score; // preferred
      else if (res.data?.user?.score) s = res.data.user.score; // alt
      else if (Array.isArray(res.data?.scores)) {
        // if server returns flattened list (rare)
        s = { misc: res.data.scores };
      }
      setScore(s || {});
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  // allow global refresh when any game updates
  useEffect(() => {
    const onChanged = () => fetchScores();
    window.addEventListener("score:changed", onChanged);
    return () => window.removeEventListener("score:changed", onChanged);
  }, [fetchScores]);

  const total = useMemo(() => sumNumbers(score), [score]);

  return {
    score,
    total,
    loading,
    error,
    refresh: fetchScores,
    setScore,
    setError,
  };
}
