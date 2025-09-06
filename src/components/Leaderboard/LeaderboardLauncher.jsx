import * as React from "react";
import { Box, Fab, Tooltip } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ResponsiveLeaderboard from "./ResponsiveLeaderboard";
import { useAuth } from "../../context/AuthContext";

export default function LeaderboardLauncher() {
  const { isAuthed } = useAuth();
  const [open, setOpen] = React.useState(false);
  if (!isAuthed) return null;

  return (
    <>
      {/* Trophy button – sits above your history FAB */}
      <Box
        sx={{
          position: "fixed",
          bottom: { xs: 86, sm: 92 }, // lift above ScoreHistory FAB at bottom-right
          right: { xs: 16, sm: 20 },
          zIndex: 1200,
        }}
      >
        <Tooltip title="Open Leaderboard">
          <Fab
            color="secondary"
            onClick={() => setOpen(true)}
            aria-label="open leaderboard"
          >
            <EmojiEventsIcon />
          </Fab>
        </Tooltip>
      </Box>

      <ResponsiveLeaderboard open={open} onClose={() => setOpen(false)} />
    </>
  );
}
