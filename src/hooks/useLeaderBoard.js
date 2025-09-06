import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { baseUrl } from "../components/constant/constant";

/**
 * Expected API:
 *   GET /api/asian-paint/leaderboard?scope=overall&limit=50
 *   GET /api/asian-paint/leaderboard?scope=day&day=day1&limit=50
 * Optional: &game=crossWord|wordSearch|quiz (if you add per-game leaderboards)
 *
 * Response shape (preferred):
 *   { leaderboard: [{ name, uuid, total }] }
 *
 * Fallbacks supported:
 *   - If rows include { score }, we compute totals from score for "overall".
 *   - For "day" scope, if rows include per-game day values, we sum day only.
 */

const vNum = (x) => (typeof x === "number" && !Number.isNaN(x) ? x : 0);

function sumScoreAllDays(score = {}) {
  const g = ["crossWord", "wordSearch", "quiz"];
  const d = ["day1", "day2", "day3"];
  return g.reduce((acc, game) => {
    const s = score[game] || {};
    return acc + d.reduce((a, day) => a + vNum(s[day]), 0);
  }, 0);
}

function sumScoreForDay(score = {}, dayKey = "day1") {
  const g = ["crossWord", "wordSearch", "quiz"];
  return g.reduce((acc, game) => acc + vNum(score?.[game]?.[dayKey]), 0);
}

export default function useLeaderboard({
  scope = "overall",
  day = "day1",
  limit = 50,
  game = "all",
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { scope: scope === "day" ? "day" : "overall", limit };
      if (scope === "day") params.day = day;
      if (game && game !== "all") params.game = game;

      const res = await axios.get(`${baseUrl}/api/asian-paint/leaderboard`, {
        params,
      });

      let lb = res.data?.leaderboard || [];
      // Fallbacks
      lb = lb.map((r) => {
        if (typeof r.total === "number") return r;
        if (r.score) {
          return {
            ...r,
            total:
              scope === "day"
                ? sumScoreForDay(r.score, day)
                : sumScoreAllDays(r.score),
          };
        }
        return { ...r, total: 0 };
      });

      // Sort by total desc just in case
      lb.sort((a, b) => b.total - a.total);
      setRows(lb);
    } catch (e) {
      setError(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scope, day, limit, game]);

  // initial + on param change
  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // refresh when scores change anywhere in app
  useEffect(() => {
    const onChanged = () => fetchBoard();
    window.addEventListener("score:changed", onChanged);
    return () => window.removeEventListener("score:changed", onChanged);
  }, [fetchBoard]);

  const top3 = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3), [rows]);

  return { rows, top3, rest, loading, error, refresh: fetchBoard };
}
