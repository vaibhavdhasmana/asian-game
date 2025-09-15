import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { GROUPS } from "../components/constant/group";
import { baseUrl } from "../components/constant/constant";
// import { GROUPS } from "../components/constant/groups"; // e.g. { day2: [...], day3: [...] }

export default function useGameSettings() {
  const [currentDay, setCurrentDay] = useState("day1");
  const [currentSlot, setCurrentSlot] = useState(1);
  const [groups, setGroups] = useState({ day2: GROUPS.day2, day3: GROUPS.day3, day4: GROUPS.day4 });
  const [loading, setLoading] = useState(false);
  // No polling by default to avoid server load. Call refresh() on game launch.

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

      // Next values to both set in state and return to caller
      const nextDay = data.currentDay
        ? String(data.currentDay).toLowerCase()
        : currentDay;
      const nextSlot = data.currentSlot != null
        ? Number(data.currentSlot) || 1
        : currentSlot;

      let nextGroups = { day2: GROUPS.day2, day3: GROUPS.day3, day4: GROUPS.day4 };
      if (data.groups && (Array.isArray(data.groups.day2) || Array.isArray(data.groups.day3) || Array.isArray(data.groups.day4))) {
        nextGroups = {
          day2: (data.groups.day2 || []).map((g) => g.key || g).filter(Boolean),
          day3: (data.groups.day3 || []).map((g) => g.key || g).filter(Boolean),
          day4: (data.groups.day4 || []).map((g) => g.key || g).filter(Boolean),
        };
      } else if (data.groupsColors) {
        // legacy fallback
        nextGroups = {
          day2: normalizeColors(data.groupsColors.day2 ?? GROUPS.day2, GROUPS.day2),
          day3: normalizeColors(data.groupsColors.day3 ?? GROUPS.day3, GROUPS.day3),
          day4: normalizeColors(data.groupsColors.day4 ?? GROUPS.day4, GROUPS.day4),
        };
      } else if (data.groupsPerDay) {
        nextGroups = {
          day2: normalizeColors(data.groupsPerDay.day2, GROUPS.day2),
          day3: normalizeColors(data.groupsPerDay.day3, GROUPS.day3),
          day4: normalizeColors(data.groupsPerDay.day4, GROUPS.day4),
        };
      }

      // Commit to state
      setCurrentDay(nextDay);
      setCurrentSlot(nextSlot);
      setGroups(nextGroups);

      // Return so callers can use the freshest values immediately
      return { currentDay: nextDay, currentSlot: nextSlot, groups: nextGroups };
    } finally {
      setLoading(false);
    }
  }, [currentDay, currentSlot]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Intentionally no polling. The dashboard calls refresh() on icon click before routing.

  return { currentDay, currentSlot, groups, loading, refresh: fetchSettings };
}
