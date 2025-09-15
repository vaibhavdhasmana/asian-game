// src/hooks/useGroupedLeaderboard.js
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { baseUrl } from "../components/constant/constant";

export default function useGroupedLeaderboard(day /* "day2"|"day3"|"day4" */) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchIt = useCallback(async () => {
    if (!day) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${baseUrl}/api/asian-paint/leaderboard/grouped`,
        { params: { day } }
      );
      setGroups(res.data?.groups || []);
    } catch (e) {
      setError(e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [day]);

  useEffect(() => {
    fetchIt();
  }, [fetchIt]);

  return { groups, loading, error, refresh: fetchIt };
}
