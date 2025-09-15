import * as React from "react";
import {
  Box,
  Fab,
  Drawer,
  IconButton,
  Typography,
  Stack,
  Paper,
  Chip,
  Divider,
  Tooltip,
  Skeleton,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";

import { useAuth } from "../../context/AuthContext";
import useUserScores from "../../hooks/useUserScores";
import useGameSettings from "../../hooks/useGameSettings";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
const GAME_LABELS = { quiz: "Quiz", wordSearch: "Word Search", jigsaw: "Jigsaw" };
const DAY_LABELS = { day1: "Day 1", day2: "Day 2", day3: "Day 3" };
const gameTotal = (g = {}) => (g.day1 || 0) + (g.day2 || 0) + (g.day3 || 0);

/**
 * Props:
 * - anchor: "right" | "bottom" | "left" | "top" (default "right")
 * - paperSx: SX overrides for the Drawer paper (background, blur, borders, etc.)
 */ import SportsSoccerOutlinedIcon from "@mui/icons-material/SportsSoccerOutlined";
export default function ScoreHistoryWidget({ anchor = "right", paperSx }) {
  const { user, isAuthed } = useAuth();
  const [open, setOpen] = React.useState(false);
  const { score, total, loading, error, refresh } = useUserScores(
    user?.uuid,
    user?.score
  );
  const { currentDay } = useGameSettings();
  const allowedDays = React.useMemo(() => {
    const d = String(currentDay);
    if (d === "day1") return ["day1"];
    if (d === "day2") return ["day1", "day2"];
    return ["day1", "day2", "day3"];
  }, [currentDay]);

  if (!isAuthed) return null;

  return (
    <>
      {/* Floating button */}
      <Box
        sx={{
          position: "fixed",
          bottom: { xs: 16, sm: 20 },
          right: { xs: 16, sm: 20 },
          zIndex: 1200,
        }}
      >
        <Tooltip title="ScoreBoard">
          <Fab
            color="primary"
            onClick={() => setOpen(true)}
            aria-label="open game history"
          >
            <SportsSoccerOutlinedIcon />
          </Fab>
        </Tooltip>
      </Box>

      {/* Drawer */}
      <Drawer
        anchor={anchor}
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            // default "glass" look
            width:
              anchor === "right" || anchor === "left"
                ? { xs: "100%", sm: 420 }
                : "100%",
            height:
              anchor === "bottom" || anchor === "top"
                ? { xs: "75vh", sm: "70vh" }
                : "100%",
            background: "rgba(17, 24, 39, 0.75)", // translucent
            backdropFilter: "saturate(180%) blur(14px)", // blur
            borderLeft:
              anchor === "right"
                ? "1px solid rgba(255,255,255,0.12)"
                : undefined,
            borderTop:
              anchor === "bottom"
                ? "1px solid rgba(255,255,255,0.12)"
                : undefined,
            color: "common.white",
            ...paperSx, // allow overrides
          },
        }}
      >
        <Box sx={{ p: 2, display: "grid", gap: 1.5 }}>
          {/* Header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6" fontWeight={800}>
              Score Board
            </Typography>
            <Stack direction="row" gap={1} alignItems="center">
              <Tooltip title="Refresh">
                <IconButton
                  onClick={refresh}
                  size="small"
                  sx={{ color: "inherit" }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <IconButton
                onClick={() => setOpen(false)}
                size="small"
                sx={{ color: "inherit" }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>

          {/* Total */}
          {loading ? (
            <Skeleton
              variant="rounded"
              width={160}
              height={32}
              sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
            />
          ) : (
            <Chip
              color={error ? "default" : "warning"}
              variant="outlined"
              label={error ? "Total: --" : `Total: ${total}`}
              sx={{
                fontWeight: 800,
                width: "fit-content",
                color: "inherit",
                borderColor: "rgba(255,255,255,0.28)",
              }}
              aria-label={
                error ? "Total score unavailable" : `Total score ${total}`
              }
            />
          )}

          <Divider sx={{ my: 1, borderColor: "rgba(255,255,255,0.12)" }} />

          {/* Per game */}
          {["quiz", "wordSearch", "jigsaw"].map((key) => {
            const g = score?.[key] || {};
            const gTotal = gameTotal(g);
            return (
              <Paper
                key={key}
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.12)",
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle1" fontWeight={800}>
                    {GAME_LABELS[key] || key}
                  </Typography>
                  {loading ? (
                    <Skeleton
                      variant="rounded"
                      width={64}
                      height={24}
                      sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
                    />
                  ) : (
                    <Chip
                      size="small"
                      label={`Total: ${gTotal}`}
                      sx={{
                        color: "inherit",
                        borderColor: "rgba(255,255,255,0.28)",
                      }}
                      variant="outlined"
                    />
                  )}
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {allowedDays.map((d) => (
                    <Chip
                      key={`${key}-${d}`}
                      variant="outlined"
                      label={`${d.toUpperCase()}: ${
                        loading ? "â€¦" : g?.[d] || 0
                      }`}
                      sx={{
                        mb: 1,
                        color: "inherit",
                        borderColor: "rgba(255,255,255,0.28)",
                      }}
                    />
                  ))}
                </Stack>
              </Paper>
            );
          })}

          {error && (
            <Typography color="error" variant="body2">
              Couldnâ€™t load scores. Try refresh.
            </Typography>
          )}

          <Box sx={{ height: 8 }} />
        </Box>
      </Drawer>
    </>
  );
}




