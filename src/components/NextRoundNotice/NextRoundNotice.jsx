import * as React from "react";
import { Alert, AlertTitle, Stack, Typography } from "@mui/material";

// Times (1-based index = slot number)
const SCHEDULE = {
  day1: ["—", "9:00 pm", "5:00 pm", "6:30 pm"],
  day2: ["—", "9:00 am", "12:00 pm", "4:00 pm", "6:00 pm"],
  day3: ["—", "9:00 am", "1:00 pm", "4:00 pm"],
};

export default function NextRoundNotice({ day = "day1", slot = 1, sx }) {
  const dayKey = String(day || "day1").toLowerCase();
  const times = SCHEDULE[dayKey] || [];
  const s = Number(slot) || 1;
  const nextTime = times[s + 1] || null; // next slot time if available
  return (
    <Alert severity="info" variant="outlined" sx={{ borderRadius: 2, ...sx }}>
      <AlertTitle sx={{ fontWeight: 900 }}>
        {nextTime
          ? `The next round unlocks at ${nextTime} — don’t miss the battle!`
          : `You're all set for today — see you in the next round!`}
      </AlertTitle>
      <Stack spacing={0.25}>
        <Typography variant="body2" sx={{ fontWeight: 800, opacity: 0.9 }}>
          {dayKey.toUpperCase()} • Current Round: {s}
        </Typography>
      </Stack>
    </Alert>
  );
}
