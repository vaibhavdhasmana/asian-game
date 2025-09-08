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
import wordSearchIcon from "../../assets/wordSearchIcon.png";
import selfieIcon from "../../assets/selfieIcon.png";
import crossword from "../../assets/crossword.png";

const QUIZ_DONE_KEY = "ap_quiz_day1_completed";
export default function GameDashboard() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { currentDay } = useGameSettings();
  const [showGroup, setShowGroup] = React.useState(false);
  const { isAuthed } = useAuth();
  const [quizDone, setQuizDone] = React.useState(
    localStorage.getItem(QUIZ_DONE_KEY) === "true"
  );
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

  React.useEffect(() => {
    const onStorage = () => {
      try {
        setUser(JSON.parse(localStorage.getItem("ap_user") || "null"));
        setQuizDone(localStorage.getItem(QUIZ_DONE_KEY) === "true");
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
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
          width: "100%",
          gap: "20px",
          px: "16px",
          flexWrap: "wrap",
          position: { md: "absolute", xs: "absolute" },
          top: { xs: "30%", md: "30%" },
          left: { xs: 0, md: 0 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: "10px",
            width: { xs: "140px", sm: "160px", md: "180px" },
            padding: "18px",
            background: "#FF3DF1",
            borderRadius: "14px",
          }}
          onClick={() => {
            navigate("/quiz");
          }}
        >
          <Box
            component="img"
            src={quizIcon}
            alt="Event Title"
            sx={{
              width: { xs: "80%", sm: "90%", md: "85%" },
            }}
          />
          <Typography
            sx={{ textAlign: "center" }}
            variant="h6"
            fontWeight={700}
          >
            Quiz
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: "10px",
            width: { xs: "140px", sm: "160px", md: "180px" },
            padding: "18px",
            background: "#FF3DF1",
            borderRadius: "14px",
          }}
          onClick={() => {
            navigate("/wordSearch");
          }}
        >
          <Box
            component="img"
            src={wordSearchIcon}
            alt="Event Title"
            sx={{
              width: { xs: "80%", sm: "90%", md: "85%" },
            }}
          />
          <Typography
            sx={{ textAlign: "center", whiteSpace: "nowrap" }}
            variant="h6"
            fontWeight={700}
          >
            Word Search
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: "10px",
            width: { xs: "140px", sm: "160px", md: "180px" },
            padding: "18px",
            background: "#FF3DF1",
            borderRadius: "14px",
          }}
          onClick={() => {
            navigate("/selfie");
          }}
        >
          <Box
            component="img"
            src={selfieIcon}
            alt="Event Title"
            sx={{
              width: { xs: "80%", sm: "90%", md: "85%" },
            }}
          />
          <Typography
            sx={{ textAlign: "center", whiteSpace: "nowrap" }}
            variant="h6"
            fontWeight={700}
          >
            Selfie
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: "10px",
            width: { xs: "140px", sm: "160px", md: "180px" },
            padding: "18px",
            background: "#FF3DF1",
            borderRadius: "14px",
          }}
          onClick={() => {
            navigate("/crossword");
          }}
        >
          <Box
            component="img"
            src={crossword}
            alt="Event Title"
            sx={{
              width: { xs: "80%", sm: "90%", md: "85%" },
            }}
          />
          <Typography
            sx={{ textAlign: "center", whiteSpace: "nowrap" }}
            variant="h6"
            fontWeight={700}
          >
            CrossWord
          </Typography>
        </Box>
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
