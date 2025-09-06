import * as React from "react";
import { Box, Chip } from "@mui/material";
import useGameSettings from "../../hooks/useGameSettings";

export default function DayBadge() {
  const { currentDay } = useGameSettings();
  const labelMap = { day1: "Day 1", day2: "Day 2", day3: "Day 3" };

  return (
    <Box
      sx={{
        position: "fixed",
        top: { xs: 64, sm: 72 },
        left: 12,
        zIndex: (t) => t.zIndex.appBar - 1,
      }}
    >
      <Chip
        color="info"
        label={`Today: ${labelMap[currentDay] || currentDay}`}
        sx={{ fontWeight: 800 }}
      />
    </Box>
  );
}
