import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { GROUPS } from "../components/constant/group";
import { baseUrl } from "../components/constant/constant";
// import { GROUPS } from "../components/constant/groups"; // e.g. { day2: [...], day3: [...] }

export default function useGameSettings() {
  const [currentDay, setCurrentDay] = useState("day1");
  const [groups, setGroups] = useState({ day2: GROUPS.day2, day3: GROUPS.day3 });
  const [loading, setLoading] = useState(false);

  const normalizeColors = (val, fallbackList) => {
    // val can be an array (already colors) or a number (count)
    if (Array.isArray(val)) {
      return val.map((c) => String(c).toLowerCase()).filter(Boolean);
    }
    const n = Number(val) || 0;
    return fallbackList.slice(0, Math.max(0, n)); // trim to requested count
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/api/admin/public/settings`);
      const data = res.data || {};

      // 1) current day
      if (data.currentDay) setCurrentDay(String(data.currentDay).toLowerCase());

      // 2) groups: support new shape { groups: { day2:[{key}], day3:[{key}] } }
      if (data.groups && (Array.isArray(data.groups.day2) || Array.isArray(data.groups.day3))) {
        setGroups({
          day2: (data.groups.day2 || []).map((g) => g.key || g).filter(Boolean),
          day3: (data.groups.day3 || []).map((g) => g.key || g).filter(Boolean),
        });
      } else if (data.groupsColors) {
        // legacy fallback
        setGroups({
          day2: normalizeColors(data.groupsColors.day2 ?? GROUPS.day2, GROUPS.day2),
          day3: normalizeColors(data.groupsColors.day3 ?? GROUPS.day3, GROUPS.day3),
        });
      } else if (data.groupsPerDay) {
        setGroups({
          day2: normalizeColors(data.groupsPerDay.day2, GROUPS.day2),
          day3: normalizeColors(data.groupsPerDay.day3, GROUPS.day3),
        });
      } else {
        setGroups({ day2: GROUPS.day2, day3: GROUPS.day3 });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { currentDay, groups, loading, refresh: fetchSettings };
}
