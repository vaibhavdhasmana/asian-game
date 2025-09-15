// src/components/admin/ServerSettingsViewer.jsx
import * as React from "react";
import { Paper, Stack, Typography, Chip, Tooltip } from "@mui/material";
import axios from "axios";
import { baseUrl } from "../constant/constant";

export default function ServerSettingsViewer({ adminKey, adminUuid, refreshKey }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState({ currentDay: "day1", currentSlot: 1, slotsPerDay: { day1: 1, day2: 1, day3: 1 } });

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = adminUuid ? { "x-admin-uuid": adminUuid } : { "x-admin-key": adminKey };
      const res = await axios.get(`${baseUrl}/api/admin/settings`, { headers });
      const d = res.data || {};
      setData({
        currentDay: d.currentDay || "day1",
        currentSlot: d.currentSlot || 1,
        slotsPerDay: d.slotsPerDay || { day1: 1, day2: 1, day3: 1 },
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  }, [adminKey, adminUuid]);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings, refreshKey]);

  const spd = data.slotsPerDay || {};
  const labelDay = String(data.currentDay || "day1").toUpperCase();

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} flexWrap="wrap">
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Current server settings
        </Typography>
        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : error ? (
          <Typography variant="body2" color="error">{error}</Typography>
        ) : (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip size="small" color="primary" label={`Day: ${labelDay}`} />
            <Chip size="small" color="secondary" label={`Active slot: ${data.currentSlot}`} />
            <Tooltip title="Slots per day">
              <Chip size="small" label={`Slots — D1:${spd.day1 ?? 1}, D2:${spd.day2 ?? 1}, D3:${spd.day3 ?? 1}, D4:${spd.day4 ?? 1}`} />
            </Tooltip>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

