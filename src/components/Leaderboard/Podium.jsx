import * as React from "react";
import { Box, Paper, Typography, Avatar, Stack } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";

const medal = {
  1: { color: "#F7C948", label: "Gold", icon: <EmojiEventsIcon /> },
  2: { color: "#C0C6D1", label: "Silver", icon: <MilitaryTechIcon /> },
  3: { color: "#D6A571", label: "Bronze", icon: <MilitaryTechIcon /> },
};

const initials = (name = "", uuid = "") => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1)
    return parts[0][0]?.toUpperCase() || uuid.slice(0, 2).toUpperCase();
  return uuid.slice(0, 2).toUpperCase();
};

function PodiumCard({ rank, row }) {
  const m = medal[rank];
  const isFirst = rank === 1;
  return (
    <Paper
      elevation={6}
      sx={{
        px: 2,
        py: 2,
        minWidth: 200,
        textAlign: "center",
        borderRadius: 3,
        transform: isFirst ? "translateY(-12px)" : "none",
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={1} alignItems="center">
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: m.color,
            color: "black",
            fontWeight: 900,
          }}
        >
          {initials(row?.name, row?.uuid)}
        </Avatar>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ color: m.color }}>{m.icon}</Box>
          <Typography fontWeight={800} color="text.primary">
            #{rank} {m.label}
          </Typography>
        </Stack>
        <Typography variant="subtitle1" fontWeight={800} noWrap maxWidth={180}>
          {row?.name || row?.uuid}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          noWrap
          maxWidth={180}
        >
          {row?.uuid}
        </Typography>
        <Box
          sx={{
            mt: 0.5,
            fontWeight: 900,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            bgcolor: "warning.light",
            color: "warning.contrastText",
          }}
        >
          {row?.total ?? 0} pts
        </Box>
      </Stack>
    </Paper>
  );
}

export default function Podium({ top3 }) {
  const [first, second, third] = top3 || [];
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
        gap: 2,
        alignItems: "end",
        justifyItems: "center",
        mb: 2,
      }}
    >
      {/* second, first (raised), third */}
      {second ? <PodiumCard rank={2} row={second} /> : <span />}
      {first ? <PodiumCard rank={1} row={first} /> : <span />}
      {third ? <PodiumCard rank={3} row={third} /> : <span />}
    </Box>
  );
}
