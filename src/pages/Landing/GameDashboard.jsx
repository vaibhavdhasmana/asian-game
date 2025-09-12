// src/pages/GameDashboard/GameDashboard.jsx
import * as React from "react";
import { Box, Typography, Snackbar, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";

import ScoreBadge from "../../components/ScoreBadge/ScoreBadge";
import ScoreHistoryWidget from "../../components/ScoreHistory/ScoreHistoryWidget";
import LeaderboardLauncher from "../../components/Leaderboard/LeaderboardLauncher";
// import DayBadge from "../../components/DayBadge/DayBadge";
import GroupSelectDialog from "../../components/GroupSelect/GroupSelectDialog";
import useGameSettings from "../../hooks/useGameSettings";
import { useAuth } from "../../context/AuthContext";
import GameLaunchDialog from "./GameLaunchDialog";
import useGroupedLeaderboard from "../../hooks/useGroupedLeaderboard";
import { GROUP_LABEL, GROUP_LOGO } from "../../components/constant/group";

import quizIcon from "../../assets/quizicon.png";
import wordSearchIcon from "../../assets/wordSearchIcon.png";
import selfieIcon from "../../assets/selfieIcon.png";
import jigsaw from "../../assets/jigsaw.png";
import axios from "axios";
import { baseUrl } from "../../components/constant/constant";

const QUIZ_DONE_KEY = "ap_quiz_day1_completed";
const GROUP_KEY = "ap_group_key";

// Central config for all launchable games
const GAMES = [
  {
    key: "quiz",
    title: "Quiz",
    description: "Quiz Quest 5 questions, more right answers = more points.",
    icon: quizIcon,
    route: "/quiz",
    bg: "#FF3DF1",
  },
  {
    key: "wordsearch",
    title: "Word Search",
    description: "Word Search Spot the words & score 50 points per game.",
    icon: wordSearchIcon,
    route: "/wordSearch",
    bg: "#FF3DF1",
  },
  {
    key: "selfie",
    title: "Selfie",
    description: "Snap a pic & save the memory!",
    icon: selfieIcon,
    route: "/selfie",
    bg: "#FF3DF1",
  },
  {
    key: "jigsaw",
    title: "JigSaw",
    description:
      "Puzzle Rush Solve fast, win big! Up to 100 points for the quickest.",
    icon: jigsaw,
    route: "/jigsaw2",
    bg: "#FF3DF1",
  },
];

export default function GameDashboard() {
  const navigate = useNavigate();
  const { isAuthed, user, setUser } = useAuth();
  const { currentDay, currentSlot, refresh } = useGameSettings();

  const [showGroup, setShowGroup] = React.useState(false);
  const [quizDone, setQuizDone] = React.useState(
    localStorage.getItem(QUIZ_DONE_KEY) === "true"
  );

  // Single state for the dialog: which game is currently launching?
  const [launcherKey, setLauncherKey] = React.useState(null);
  const currentGame = React.useMemo(
    () => GAMES.find((g) => g.key === launcherKey) || null,
    [launcherKey]
  );

  const [snack, setSnack] = React.useState({ open: false, message: "" });

  // Prompt group selection on day2/day3con if not set
  React.useEffect(() => {
    if (!isAuthed) return;
    if (currentDay === "day2" || currentDay === "day3") {
      const saved = localStorage.getItem(GROUP_KEY);
      if (!saved) setShowGroup(true);
    }
  }, [isAuthed, currentDay]);

  const onPickGroup = (groupKey) => {
    localStorage.setItem(GROUP_KEY, groupKey);
    window.dispatchEvent(new Event("score:changed"));
  };

  // Keep dashboard in sync with localStorage changes
  React.useEffect(() => {
    const onStorage = () => {
      try {
        setUser(JSON.parse(localStorage.getItem("ap_user") || "null"));
        setQuizDone(localStorage.getItem(QUIZ_DONE_KEY) === "true");
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setUser]);

  // Handlers
  const openLauncher = (key) => async () => {
    try {
      await refresh?.();
    } catch {}
    setLauncherKey(key);
  };
  const closeLauncher = () => setLauncherKey(null);
  const confirmLauncher = async () => {
    // Fetch latest settings and use them immediately to avoid stale day/slot
    let latest = null;
    try {
      latest = await refresh?.();
    } catch {}
    if (!currentGame) return;

    const dayKey = String(
      latest?.currentDay || currentDay || "day1"
    ).toLowerCase();
    const slot = Number(latest?.currentSlot || currentSlot || 1);
    const userObj =
      user || JSON.parse(localStorage.getItem("ap_user") || "null");
    const uuid = userObj?.uuid || userObj?.uniqueNo || null;

    const mapGameKey = (k) => (k === "wordsearch" ? "wordSearch" : k);
    const gameParam = mapGameKey(currentGame.key);

    // Pass day and slot via query params so the game reads them immediately
    navigate(
      `${currentGame.route}?day=${encodeURIComponent(dayKey)}&slot=${slot}`
    );
    setLauncherKey(null);
  };

  // Small, reusable tile
  const GameTile = ({ game }) => (
    <Box
      onClick={openLauncher(game.key)}
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "10px",
        width: { xs: "140px", sm: "160px", md: "180px" },
        p: "18px",
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        borderRadius: "16px",
        cursor: "pointer",
        userSelect: "none",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.14)",
        transition: "transform 160ms ease, box-shadow 160ms ease",
        "&:hover": {
          transform: "translateY(-4px) scale(1.02)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        },
      }}
    >
      <Box
        component="img"
        src={game.icon}
        alt={game.title}
        sx={{
          width: { xs: "80%", sm: "90%", md: "85%" },
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.35))",
        }}
      />
      <Typography
        sx={{ textAlign: "center", whiteSpace: "nowrap" }}
        variant="h6"
        fontWeight={900}
      >
        {game.title}
      </Typography>
    </Box>
  );

  return (
    <>
      {/* Fixed badges (Day badge hidden per request) */}
      <ScoreBadge />

      {/* Group header (visible on day2/day3 when user picked a group) */}
      {["day2", "day3"].includes(currentDay) &&
      localStorage.getItem(GROUP_KEY) ? (
        <GroupHeader
          day={currentDay}
          groupKey={localStorage.getItem(GROUP_KEY)}
        />
      ) : null}

      {/* One reusable launcher dialog driven by config */}
      <GameLaunchDialog
        open={Boolean(currentGame)}
        onClose={closeLauncher}
        onConfirm={confirmLauncher}
        title={currentGame?.title || ""}
        description={currentGame?.description || ""}
        confirmLabel="OK, take me there"
        cancelLabel="Not now"
      />

      {/* <Typography
        sx={{ mt: { xs: "120px", sm: "90px" }, p: 3 }}
        variant="body"
        fontWeight={800}
        gutterBottom
        color="#41E3FE"
      >
        Welcome !
      </Typography> */}

      {/* Group picker when admin set day2/3 */}
      <GroupSelectDialog
        open={showGroup}
        onClose={() => setShowGroup(false)}
        day={currentDay}
        onSelect={onPickGroup}
      />

      {/* Game tiles */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          gap: "20px",
          px: "16px",
          flexWrap: "wrap",
          position: "absolute",
          top: { xs: "34%", md: "34%" },
          left: 0,
        }}
      >
        {GAMES.map((g) => (
          <GameTile key={g.key} game={g} />
        ))}
      </Box>

      <LeaderboardLauncher />
      <ScoreHistoryWidget
        anchor="right"
        paperSx={{
          background: "rgba(17, 24, 39, 0.75)",
          backdropFilter: "saturate(180%) blur(12px)",
        }}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={1800}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert severity="warning" variant="filled" sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}

function GroupHeader({ day, groupKey }) {
  const { groups, loading } = useGroupedLeaderboard(day);
  const list = React.useMemo(() => {
    const g = (groups || [])
      .slice()
      .sort((a, b) => (b.total || 0) - (a.total || 0));
    return g;
  }, [groups]);
  const idx = React.useMemo(
    () => list.findIndex((g) => g.groupKey === groupKey),
    [list, groupKey]
  );
  const rank = idx >= 0 ? idx + 1 : null;
  const row = idx >= 0 ? list[idx] : null;
  const label = row?.label || GROUP_LABEL[groupKey] || groupKey;
  const logo = row?.logo || GROUP_LOGO[groupKey] || null;
  const total = row?.total ?? 0;

  return (
    <Box
      sx={{
        position: "absolute",
        top: { xs: 64, sm: 72 },
        left: 16,
        right: 16,
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        component="img"
        src={logo}
        alt={label}
        sx={{
          width: { xs: 64, md: 80 },
          height: { xs: 64, md: 80 },
          borderRadius: 2,
          objectFit: "contain",
          bgcolor: "rgba(255,255,255,0.06)",
          border: "1px solid",
          borderColor: "rgba(255,255,255,0.18)",
        }}
      />
      <Box sx={{ display: "grid", gap: 0.5 }}>
        <Box sx={{ fontWeight: 900, fontSize: { xs: 18, md: 22 } }}>
          {label}
        </Box>
        <Box sx={{ color: "text.secondary", fontWeight: 700 }}>
          {loading ? "Loading..." : `Score: ${total}  •  Rank: ${rank || "-"}`}
        </Box>
      </Box>
    </Box>
  );
}
