// src/pages/GameDashboard/GameDashboard.jsx
import * as React from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

import ScoreBadge from "../../components/ScoreBadge/ScoreBadge";
import ScoreHistoryWidget from "../../components/ScoreHistory/ScoreHistoryWidget";
import LeaderboardLauncher from "../../components/Leaderboard/LeaderboardLauncher";
import DayBadge from "../../components/DayBadge/DayBadge";
import GroupSelectDialog from "../../components/GroupSelect/GroupSelectDialog";
import useGameSettings from "../../hooks/useGameSettings";
import { useAuth } from "../../context/AuthContext";
import GameLaunchDialog from "./GameLaunchDialog";

import quizIcon from "../../assets/quizicon.png";
import wordSearchIcon from "../../assets/wordSearchIcon.png";
import selfieIcon from "../../assets/selfieIcon.png";
import jigsaw from "../../assets/jigsaw.png";

const QUIZ_DONE_KEY = "ap_quiz_day1_completed";
const GROUP_KEY = "ap_group_color"; // fixed (removed stray brace)

// Central config for all launchable games
const GAMES = [
  {
    key: "quiz",
    title: "Quiz",
    description: "Quiz Quest – 5 questions, more right answers = more points.",
    icon: quizIcon,
    route: "/quiz",
    bg: "#FF3DF1",
  },
  {
    key: "wordsearch",
    title: "Word Search",
    description: "Word Search – Spot the words & score 50 points per game.",
    icon: wordSearchIcon,
    route: "/wordSearch",
    bg: "#FF3DF1",
  },
  {
    key: "selfie",
    title: "Selfie",
    description:
      "Selfie Spot – Snap a pic with our branding & save the memory!",
    icon: selfieIcon,
    route: "/selfie",
    bg: "#FF3DF1",
  },
  {
    key: "jigsaw",
    title: "JigSaw",
    description:
      "Puzzle Rush – Solve fast, win big! Up to 160 points for the quickest.",
    icon: jigsaw,
    route: "/jigsaw2",
    bg: "#FF3DF1",
  },
];

export default function GameDashboard() {
  const navigate = useNavigate();
  const { isAuthed, user, setUser } = useAuth();
  const { currentDay } = useGameSettings();
  console.log(useGameSettings);

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

  // Prompt group selection on day2/day3 if not set
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
  const openLauncher = (key) => () => setLauncherKey(key);
  const closeLauncher = () => setLauncherKey(null);
  const confirmLauncher = () => {
    if (!currentGame) return;
    navigate(currentGame.route);
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
        background: game.bg,
        borderRadius: "14px",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <Box
        component="img"
        src={game.icon}
        alt={game.title}
        sx={{ width: { xs: "80%", sm: "90%", md: "85%" } }}
      />
      <Typography
        sx={{ textAlign: "center", whiteSpace: "nowrap" }}
        variant="h6"
        fontWeight={700}
      >
        {game.title}
      </Typography>
    </Box>
  );

  return (
    <>
      {/* Fixed badges */}
      <ScoreBadge />
      <DayBadge />

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

      <Typography
        sx={{ mt: { xs: "120px", sm: "90px" }, p: 3 }}
        variant="body"
        fontWeight={800}
        gutterBottom
        color="#41E3FE"
      >
        Welcome !
      </Typography>

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
          top: { xs: "30%", md: "30%" },
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
    </>
  );
}
