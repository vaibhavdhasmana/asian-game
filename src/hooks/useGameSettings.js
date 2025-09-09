import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { GROUPS } from "../components/constant/group";
import { baseUrl } from "../components/constant/constant";
// import { GROUPS } from "../components/constant/groups"; // e.g. { day2: [...], day3: [...] }

export default function useGameSettings() {
  const [currentDay, setCurrentDay] = useState("day1");
  const [groupsColors, setGroupsColors] = useState({
    day2: GROUPS.day2,
    day3: GROUPS.day3,
  });
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

      // 2) groups: accept either groupsColors (arrays) or groupsPerDay (counts)
      if (data.groupsColors) {
        setGroupsColors({
          day2: normalizeColors(
            data.groupsColors.day2 ?? GROUPS.day2,
            GROUPS.day2
          ),
          day3: normalizeColors(
            data.groupsColors.day3 ?? GROUPS.day3,
            GROUPS.day3
          ),
        });
      } else if (data.groupsPerDay) {
        setGroupsColors({
          day2: normalizeColors(data.groupsPerDay.day2, GROUPS.day2),
          day3: normalizeColors(data.groupsPerDay.day3, GROUPS.day3),
        });
      } else {
        // fallback to local constants
        setGroupsColors({ day2: GROUPS.day2, day3: GROUPS.day3 });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { currentDay, groupsColors, loading, refresh: fetchSettings };
}
