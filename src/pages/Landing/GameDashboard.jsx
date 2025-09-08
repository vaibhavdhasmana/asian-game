import * as React from "react";
import { Box, Container, Grid, Paper, Typography, Button } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import ScoreBadge from "../../components/ScoreBadge/ScoreBadge";
import ScoreHistoryWidget from "../../components/ScoreHistory/ScoreHistoryWidget";
import LeaderBoard from "../../components/Leaderboard/LeaderBoard";
import LeaderboardLauncher from "../../components/Leaderboard/LeaderboardLauncher";
import DayBadge from "../../components/DayBadge/DayBadge";
import GroupSelectDialog from "../../components/GroupSelect/GroupSelectDialog";
import useGameSettings from "../../hooks/useGameSettings";
import { useAuth } from "../../context/AuthContext";
import QuizTile from "../QuizGame/QuizTile";
import quizIcon from "../../assets/quizicon.png";
const QUIZ_DONE_KEY = "ap_quiz_day1_completed";

// Game configurations
const getGames = (currentDay) => [
  {
    id: "quiz",
    name: "Quiz",
    path: "/quiz",
    icon: quizIcon,
    bgColor: "#FF3DF1",
    completionKey: `ap_quiz_${currentDay}_completed`,
  },
  {
    id: "crossword",
    name: "Crossword",
    path: "/game",
    icon: quizIcon, // TODO: Add crossword icon
    bgColor: "#41E3FE",
    completionKey: `ap_crossword_${currentDay}_completed`,
  },
  {
    id: "wordsearch",
    name: "Word Search",
    path: "/wordsearch",
    icon: quizIcon, // TODO: Add word search icon
    bgColor: "#FFD700",
    completionKey: `ap_wordsearch_${currentDay}_completed`,
  },
];
export default function GameDashboard() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { currentDay } = useGameSettings();
  const [showGroup, setShowGroup] = React.useState(false);
  const { isAuthed } = useAuth();
  const [quizDone, setQuizDone] = React.useState(
    localStorage.getItem(QUIZ_DONE_KEY) === "true"
  );
  const [gameCompletions, setGameCompletions] = React.useState({});
  // After login: if day2/3 and no saved group, prompt
  React.useEffect(() => {
    if (!isAuthed) return;
    if (currentDay === "day2" || currentDay === "day3") {
      const key = `ap_group_color}`;
      const saved = localStorage.getItem(key);
      if (!saved) setShowGroup(true);
    }
  }, [isAuthed, currentDay]);

  const onPickGroup = (groupKey) => {
    const key = `ap_group_color`;
    localStorage.setItem(key, groupKey);
    // notify others to refresh content if needed
    window.dispatchEvent(new Event("score:changed"));
  };

  // Track game completions
  React.useEffect(() => {
    const games = getGames(currentDay);
    const completions = {};
    games.forEach((game) => {
      completions[game.id] =
        localStorage.getItem(game.completionKey) === "true";
    });
    setGameCompletions(completions);
  }, [currentDay]);

  React.useEffect(() => {
    const onStorage = () => {
      try {
        setUser(JSON.parse(localStorage.getItem("ap_user") || "null"));
        setQuizDone(localStorage.getItem(QUIZ_DONE_KEY) === "true");

        // Update game completions
        const games = getGames(currentDay);
        const completions = {};
        games.forEach((game) => {
          completions[game.id] =
            localStorage.getItem(game.completionKey) === "true";
        });
        setGameCompletions(completions);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [currentDay]);
  return (
    <>
      {/* Fixed badge below navbar */}
      <ScoreBadge />
      <DayBadge />

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

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          width: "100%",
          gap: { xs: "16px", sm: "20px" },
          px: { xs: "12px", sm: "16px" },
          position: { md: "absolute", xs: "absolute" },
          top: { xs: "35%", sm: "32%", md: "30%" },
          left: { xs: 0, md: 0 },
          maxWidth: "100%",
          overflowX: "auto",
          pb: 2,
        }}
      >
        {getGames(currentDay).map((game) => {
          const isCompleted = gameCompletions[game.id];
          return (
            <Box
              key={game.id}
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                gap: "10px",
                width: { xs: "140px", sm: "160px", md: "180px" },
                padding: "18px",
                background: isCompleted ? "#4CAF50" : game.bgColor,
                borderRadius: "14px",
                cursor: showGroup || isCompleted ? "not-allowed" : "pointer",
                opacity: showGroup || isCompleted ? 0.6 : 1,
                transition: "all 0.2s ease",
                position: "relative",
                "&:hover": {
                  transform: showGroup || isCompleted ? "none" : "scale(1.05)",
                },
              }}
              onClick={() => {
                if (showGroup || isCompleted) return;
                navigate(game.path);
              }}
            >
              {isCompleted && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 5,
                    right: 5,
                    bgcolor: "white",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    color="success.main"
                  >
                    ✓
                  </Typography>
                </Box>
              )}
              <Box
                component="img"
                src={game.icon}
                alt={game.name}
                sx={{
                  width: { xs: "80%", sm: "90%", md: "85%" },
                }}
              />
              <Typography
                sx={{ textAlign: "center" }}
                variant="h6"
                fontWeight={700}
              >
                {game.name}
              </Typography>
              {isCompleted && (
                <Typography
                  sx={{ textAlign: "center", fontSize: "0.75rem" }}
                  variant="caption"
                  color="white"
                >
                  Completed
                </Typography>
              )}
            </Box>
          );
        })}
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
