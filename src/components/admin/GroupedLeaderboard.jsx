// src/components/Leaderboard/GroupedLeaderboard.jsx
import * as React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Chip,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Skeleton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import useGroupedLeaderboard from "../../hooks/useGroupedLeaderboard";
import { useAuth } from "../../context/AuthContext";

export default function GroupedLeaderboard({ day /* "day2"|"day3" */ }) {
  const { user } = useAuth();
  const { groups, loading } = useGroupedLeaderboard(day);

  if (loading) {
    return (
      <Box sx={{ display: "grid", gap: 1 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={60} />
        ))}
      </Box>
    );
  }

  if (!groups.length) {
    return <Typography color="text.secondary">No data yet.</Typography>;
  }

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {groups.map((g, idx) => (
        <Accordion key={g.groupKey} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ width: "100%", justifyContent: "space-between" }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={`#${idx + 1}`} />
                <Chip size="small" label={g.groupKey.toUpperCase()} />
              </Stack>
              <Chip
                icon={<EmojiEventsIcon />}
                color="warning"
                variant="outlined"
                label={`Group total: ${g.groupTotal}`}
                sx={{ fontWeight: 800 }}
              />
            </Stack>
          </AccordionSummary>

          <AccordionDetails>
            <List dense>
              {g.members.map((m, i) => {
                const isMe = m.uuid === user?.uuid;
                return (
                  <ListItem
                    key={m.uuid}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: isMe ? "warning.light" : "transparent",
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography fontWeight={800}>
                          {i + 1}. {m.name || m.uuid}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          Crossword: {m.breakdown.crossWord} · WordSearch:{" "}
                          {m.breakdown.wordSearch} · Quiz: {m.breakdown.quiz}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={`${m.total} pts`}
                        color={isMe ? "warning" : "default"}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
