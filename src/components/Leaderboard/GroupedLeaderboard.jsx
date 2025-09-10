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
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import useGroupedLeaderboard from "../../hooks/useGroupedLeaderboard";
import { useAuth } from "../../context/AuthContext";
import StarsSharpIcon from "@mui/icons-material/StarsSharp";
export default function GroupedLeaderboard({ day }) {
  const { user } = useAuth();
  const { groups, loading } = useGroupedLeaderboard(day);

  console.log("groups:", user);
  if (loading) {
    return (
      <Box sx={{ display: "grid", gap: 1 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={60} />
        ))}
      </Box>
    );
  }

  if (!groups.length)
    return <Typography color="text.secondary">No data yet.</Typography>;

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {groups.map((g, idx) => (
        <Accordion key={g.groupKey} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                fontSize: { xs: "12px", md: "18px" },
                fontWeight: 600,
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={`#${idx + 1}`} />
                <Chip
                  sx={{ fontSize: { xs: "12px", md: "18px" }, fontWeight: 600 }}
                  size="small"
                  label={(g.label || g.groupKey || "").toUpperCase()}
                />
              </Stack>
              {(user?.groupKey && g.groupKey === user.groupKey) ||
              (user?.groupSelection?.[day] &&
                g.groupKey === user.groupSelection[day]) ? (
                <StarsSharpIcon sx={{ color: "warning.light" }} />
              ) : null}
              <Chip
                icon={<EmojiEventsIcon />}
                color="warning"
                variant="outlined"
                label={`Score: ${g.total}`}
                sx={{ fontSize: { xs: "12px", md: "18px" }, fontWeight: 600 }}
              />
            </Stack>
          </AccordionSummary>
          <AccordionDetails
            sx={{
              overflowY: "scroll",
              maxHeight: "300px",
              "&::-webkit-scrollbar": {
                width: 5, // or height for horizontal scrollbars
              },
            }}
          >
            <List dense>
              {g.members.map((m, i) => {
                const isMe = m.uuid === user?.uuid;
                return (
                  <>
                    <ListItem
                      key={m.uuid}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        bgcolor: isMe ? "warning.light" : "transparent",
                      }}
                    >
                      {/* <ListItemText
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
                    /> */}
                      <Box
                        sx={{
                          position: "relative",
                          width: "100%",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            gap: "6px",
                            flexDirection: "column",
                          }}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontSize: { xs: "14px", md: "16px" },
                                fontWeight: { xs: "500", md: "600" },
                              }}
                            >
                              {i + 1}. {m.name || m.uuid}
                            </Typography>
                          </Box>
                          {/* Breakdown not available from API; hide to avoid errors */}
                        </Box>
                        <Box
                          sx={{
                            position: "absolute",
                            right: "-14px",
                            top: { xs: "-2px", md: "2px" },
                          }}
                        >
                          <Chip
                            label={`${m.total} pts`}
                            color={isMe ? "warning" : "default"}
                          />
                        </Box>
                      </Box>
                    </ListItem>
                    <Divider sx={{ mt: "12px", mb: "12px" }} />
                  </>
                );
              })}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
