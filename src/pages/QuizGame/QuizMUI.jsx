// src/pages/QuizGame/QuizMUI.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Stack,
  Chip,
  LinearProgress,
  Grid,
  Divider,
  Paper,
  Alert,
  Snackbar,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useGameSettings from "../../hooks/useGameSettings";

/* ==============================
   CONFIG
   ============================== */
const TIMER_SECONDS = 30;
const POINTS_PER_CORRECT = 10;

// Adjust to your env (mirrors your constant file)
const baseUrl =
  import.meta.env.VITE_APP_ENV === "local"
    ? "http://localhost:7000"
    : "https://api.nivabupalaunchevent.com";

/* ==============================
   QUESTIONS (per day) — replace with real sets
   ============================== */
const QUESTIONS_BY_DAY = {
  day1: [
    {
      id: 1,
      question: "Asian Paints DécorPro helps customers with:",
      options: [
        "Waterproofing only",
        "Paint shades only",
        `Décor, furnishings & interior styling`,
        "Outdoor landscaping only",
      ],
      correctIndex: 2,
      explanation:
        "DécorPro offers integrated décor, furnishings, and interior styling services beyond just paint.",
    },
    {
      id: 2,
      question: "Which London landmark is home to the Crown Jewels?",
      options: [
        "Tower of London",
        "Buckingham Palace",
        `St. Paul’s Cathedral`,
        "Westminster Abbey",
      ],
      correctIndex: 0,
      explanation:
        "The Crown Jewels are housed in the Jewel House at the Tower of London.",
    },
    {
      id: 3,
      question: `London’s famous double-decker bus is traditionally what colour?`,
      options: ["Blue", "Yellow", "Red", "Green"],
      correctIndex: 2,
      explanation: "Red double-deckers are an iconic symbol of London.",
    },
    {
      id: 4,
      question: "DécorPro experts also provide guidance on:",
      options: [
        "Choosing wall finishes and textures",
        "Buying new smartphones",
        "Selecting cooking recipes",
        "Hiring travel guides",
      ],
      correctIndex: 0,
      explanation:
        "DécorPro assists with selecting wall finishes, textures, and related interior choices.",
    },
    {
      id: 5,
      question: "The famous London Ferris wheel is called:",
      options: ["Big Eye", "The Shard Wheel", "London Eye", "Tower Wheel"],
      correctIndex: 2,
      explanation:
        "The London Eye is the city’s landmark observation wheel on the South Bank.",
    },
  ],
  day2: [
    {
      id: 1,
      question: "CSS stands for…",
      options: [
        "Cool Style Sheet",
        "Cascading Style Sheets",
        "Creative Styling System",
        "Compute Style Source",
      ],
      correctIndex: 1,
      explanation: "CSS = Cascading Style Sheets.",
    },
    {
      id: 2,
      question: "Which tag is not semantic HTML?",
      options: ["<section>", "<article>", "<div>", "<header>"],
      correctIndex: 2,
      explanation: "<div> is generic, others are semantic.",
    },
    {
      id: 3,
      question: "Which is NOT an HTTP method?",
      options: ["GET", "PUSH", "POST", "DELETE"],
      correctIndex: 1,
      explanation: "PUSH is not a standard HTTP verb.",
    },
    {
      id: 4,
      question: "LocalStorage value types are…",
      options: ["Only numbers", "Only objects", "Strings", "Booleans"],
      correctIndex: 2,
      explanation: "localStorage stores strings.",
    },
    {
      id: 5,
      question: "Which JS method converts JSON string to object?",
      options: [
        "JSON.parse()",
        "JSON.object()",
        "JSON.eval()",
        "JSON.stringify()",
      ],
      correctIndex: 0,
      explanation: "parse string → object; stringify object → string.",
    },
  ],
  day3: [
    {
      id: 1,
      question: "MongoDB stores data as…",
      options: ["Tables", "Documents (BSON/JSON)", "CSV", "Rows/Columns"],
      correctIndex: 1,
      explanation: "Mongo uses a document model.",
    },
    {
      id: 2,
      question: "Which is a NoSQL DB?",
      options: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"],
      correctIndex: 2,
      explanation: "MongoDB is NoSQL.",
    },
    {
      id: 3,
      question: "Which array method returns a new filtered array?",
      options: ["forEach", "filter", "reduce", "sort"],
      correctIndex: 1,
      explanation: "filter returns a new array.",
    },
    {
      id: 4,
      question: "Which is NOT a valid React hook?",
      options: ["useState", "useMemo", "useFetch", "useEffect"],
      correctIndex: 2,
      explanation: "useFetch isn’t a built-in hook.",
    },
    {
      id: 5,
      question: "HTTP 404 means…",
      options: ["Unauthorized", "Bad Request", "Not Found", "Forbidden"],
      correctIndex: 2,
      explanation: "404 = Not Found.",
    },
  ],
};

// (Optional) shuffle hook
function useShuffledQuestions(questions, shouldShuffle = false) {
  return useMemo(() => {
    if (!shouldShuffle) return questions;
    const arr = [...questions];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [questions, shouldShuffle]);
}

export default function QuizMUI() {
  const navigate = useNavigate();

  // Pull the active day from game settings
  const gs = useGameSettings() || {};
  console.log("gs--", gs);
  const rawFromSettings =
    gs.activeDay ||
    gs.day ||
    gs.currentDay ||
    gs.gameDay ||
    gs.settings?.activeDay ||
    gs.settings?.day ||
    "day1";

  const dayKey = useMemo(() => {
    const v = String(rawFromSettings).toLowerCase();
    return ["day1", "day2", "day3"].includes(v) ? v : "day1";
  }, [rawFromSettings]);

  // Dynamic LS keys per day
  const KEYS = useMemo(() => {
    return {
      user: "ap_user",
      state: `ap_quiz_state_${dayKey}`,
      done: `ap_quiz_completed_${dayKey}`,
    };
  }, [dayKey]);

  // Questions for the active day
  const questionsForDay = QUESTIONS_BY_DAY[dayKey] || QUESTIONS_BY_DAY.day1;
  const quiz = useShuffledQuestions(questionsForDay, false);

  const [qIndex, setQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState(null); // "correct" | "wrong" | "timeout" | null
  const [finished, setFinished] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "" });

  // NEW: ensure we block the UI until server lock check is complete
  const [serverLockChecked, setServerLockChecked] = useState(false);

  const intervalRef = useRef(null);
  const autoNextRef = useRef(null);

  /* ---------------------------------------------------
   * 1) SERVER LOCK CHECK (prevents play after LS delete)
   * --------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
        const uuid = user?.uuid || user?.uniqueNo;
        if (!uuid) {
          // No UUID — allow play (or you can redirect to login)
          setAlreadySubmitted(false);
          setServerLockChecked(true);
          return;
        }

        const { data } = await axios.get(
          `${baseUrl}/api/asian-paint/score/status`,
          {
            params: { uuid, game: "quiz", day: dayKey },
          }
        );

        if (data?.submitted) {
          // Server says this day is already submitted — HARD LOCK
          localStorage.setItem(KEYS.done, "true");
          setAlreadySubmitted(true);
          setFinished(true);
          if (typeof data.points === "number") {
            setScore(data.points); // show the server score in the Finished screen
          }
        } else {
          // Not submitted server-side — clear any stale local 'done' flag
          localStorage.removeItem(KEYS.done);
          setAlreadySubmitted(false);
        }
      } catch {
        // If status endpoint fails, fall back to local flag
        const localDone = localStorage.getItem(KEYS.done) === "true";
        setAlreadySubmitted(localDone);
        if (localDone) setFinished(true);
      } finally {
        setServerLockChecked(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, KEYS.user, KEYS.done]);

  /* ---------------------------------------------------
   * 2) LOAD LOCAL PROGRESS (only if not server-locked)
   * --------------------------------------------------- */
  useEffect(() => {
    if (!serverLockChecked) return;
    if (alreadySubmitted) return; // don't resume if server says it's done
    try {
      const raw = localStorage.getItem(KEYS.state);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.qIndex === "number") setQIndex(saved.qIndex);
      if (typeof saved.score === "number") setScore(saved.score);
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverLockChecked, alreadySubmitted, KEYS.state]);

  /* ---------------------------------------------------
   * 3) TIMER
   * --------------------------------------------------- */
  useEffect(() => {
    if (!serverLockChecked) return; // avoid flashing timer before lock check
    if (finished) return;
    clearInterval(intervalRef.current);
    setSecondsLeft(TIMER_SECONDS);
    setSelected(null);
    setLocked(false);
    setStatus(null);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setLocked(true);
          setStatus("timeout");
          autoNextRef.current = setTimeout(() => handleNext(), 1200);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(autoNextRef.current);
    };
  }, [qIndex, finished, serverLockChecked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(autoNextRef.current);
    };
  }, []);

  /* ---------------------------------------------------
   * 4) PERSIST PROGRESS (per day)
   * --------------------------------------------------- */
  useEffect(() => {
    if (!serverLockChecked) return;
    if (finished) return;
    localStorage.setItem(KEYS.state, JSON.stringify({ qIndex, score }));
  }, [qIndex, score, finished, KEYS.state, serverLockChecked]);

  const current = quiz[qIndex];

  const handleOptionClick = (idx) => {
    if (!serverLockChecked) return;
    if (locked || finished) return;
    setSelected(idx);
    const isCorrect = idx === current.correctIndex;
    setLocked(true);
    setStatus(isCorrect ? "correct" : "wrong");
    clearInterval(intervalRef.current);
    if (isCorrect) setScore((s) => s + POINTS_PER_CORRECT);
  };

  const handleNext = () => {
    clearTimeout(autoNextRef.current);
    if (qIndex + 1 < quiz.length) {
      setQIndex((i) => i + 1);
    } else {
      finishQuiz();
    }
  };

  const submitScore = async (points) => {
    try {
      const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
      const uuid = user?.uuid || user?.uniqueNo;
      if (!uuid) return;

      await axios.post(`${baseUrl}/api/asian-paint/score`, {
        uuid,
        game: "quiz",
        day: dayKey,
        points,
      });
      setSnack({ open: true, message: "Score submitted!" });
    } catch (e) {
      if (e?.response?.status === 409) {
        // Server double-submission guard
        setSnack({ open: true, message: "Already submitted" });
        // Enforce local lock too
        localStorage.setItem(KEYS.done, "true");
        setAlreadySubmitted(true);
        setFinished(true);
      } else {
        setSnack({ open: true, message: "Score saved locally (offline)" });
      }
    }
  };

  const finishQuiz = () => {
    setFinished(true);
    localStorage.setItem(KEYS.done, "true"); // mark THIS day completed
    localStorage.removeItem(KEYS.state); // clear THIS day progress
    setAlreadySubmitted(true);
    submitScore(score);
  };

  const progressPct = (secondsLeft / TIMER_SECONDS) * 100;
  const qNumber = qIndex + 1;
  const totalPoints = quiz.length * POINTS_PER_CORRECT;

  // While we’re checking the server lock, render a minimal loader
  if (!serverLockChecked) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography>Checking attempt status…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
      <Grid container justifyContent="center" sx={{ mt: 6, px: "12px" }}>
        <Grid item xs={12} md={9} lg={8}>
          <Stack spacing={2} alignItems="stretch">
            <Typography
              sx={{
                fontSize: { xs: "16px", md: "18px" },
                fontWeight: { xs: 600, md: 800 },
              }}
              align="center"
              color="primary"
            >
              {dayKey.toUpperCase()} - Quiz
            </Typography>

            <Paper elevation={3} sx={{ p: 2 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <Chip
                  label={
                    <Typography fontWeight={700}>
                      Score:{" "}
                      <Typography
                        component="span"
                        color="primary.main"
                        fontWeight={800}
                      >
                        {score}
                      </Typography>{" "}
                      / {totalPoints}
                    </Typography>
                  }
                  variant="outlined"
                />
                <Typography fontWeight={700}>
                  {POINTS_PER_CORRECT} points per correct • Question{" "}
                  {Math.min(qNumber, quiz.length)} / {quiz.length}
                </Typography>
                {!finished && (
                  <Chip
                    icon={<AccessTimeIcon />}
                    color={
                      secondsLeft <= 5
                        ? "error"
                        : secondsLeft <= 10
                        ? "warning"
                        : "default"
                    }
                    label={`${secondsLeft}s`}
                    sx={{ fontWeight: 700 }}
                  />
                )}
                {alreadySubmitted && (
                  <Chip
                    color="success"
                    variant="filled"
                    label="Already submitted"
                  />
                )}
              </Stack>

              {!finished && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progressPct}
                    sx={{ height: 8, borderRadius: 999 }}
                  />
                </Box>
              )}
            </Paper>

            {!finished ? (
              <Card elevation={6}>
                <CardHeader
                  title={
                    <Typography
                      sx={{
                        fontSize: { xs: "1rem", md: "1.2rem" },
                        fontWeight: 600,
                      }}
                    >
                      {quiz[qIndex]?.question}
                    </Typography>
                  }
                  subheader={
                    status === "timeout" ? (
                      <Typography color="error">Time’s up!</Typography>
                    ) : null
                  }
                />
                <CardContent>
                  <Stack spacing={1.5}>
                    {quiz[qIndex]?.options.map((opt, idx) => {
                      const isCorrect = idx === quiz[qIndex].correctIndex;
                      const isSelected = idx === selected;

                      let variant = "outlined";
                      let color = "inherit";
                      let startIcon = null;

                      if (locked) {
                        if (isCorrect) {
                          variant = "contained";
                          color = "success";
                          startIcon = <CheckCircleIcon />;
                        } else if (isSelected && !isCorrect) {
                          variant = "contained";
                          color = "error";
                          startIcon = <CancelIcon />;
                        }
                      } else if (isSelected) {
                        color = "primary";
                        variant = "contained";
                      }

                      return (
                        <Button
                          key={idx}
                          onClick={() => handleOptionClick(idx)}
                          variant={variant}
                          color={color}
                          startIcon={startIcon}
                          disabled={locked}
                          sx={{
                            justifyContent: "flex-start",
                            textTransform: "none",
                            fontWeight: 700,
                            py: 1.25,
                          }}
                          fullWidth
                        >
                          <Box
                            component="span"
                            sx={{
                              mr: 1.25,
                              opacity: 0.7,
                              fontWeight: 800,
                              minWidth: 22,
                              display: "inline-block",
                            }}
                          >
                            {String.fromCharCode(65 + idx)}.
                          </Box>
                          {opt}
                        </Button>
                      );
                    })}
                  </Stack>

                  <Stack
                    direction={{ xs: "row", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                    sx={{ mt: 3 }}
                  >
                    <Typography variant="body1">
                      {locked && status === "correct" && (
                        <Chip
                          color="success"
                          label={`Correct! +${POINTS_PER_CORRECT}`}
                        />
                      )}
                      {locked && status === "wrong" && (
                        <Chip color="error" label="Incorrect" />
                      )}
                      {locked && status === "timeout" && (
                        <Chip color="error" label="Time’s up" />
                      )}
                    </Typography>

                    <Stack direction="row" spacing={1.5}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        disabled={!locked}
                      >
                        {qIndex + 1 < quiz.length ? "Next" : "Finish"}
                      </Button>
                    </Stack>
                  </Stack>

                  {locked && quiz[qIndex]?.explanation && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        <strong>Explanation:</strong> {quiz[qIndex].explanation}
                      </Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card elevation={6}>
                <CardContent>
                  <Typography
                    sx={{
                      fontSize: { xs: "1.1rem", md: "1.5rem" },
                      fontWeight: { xs: 600, md: 800 },
                    }}
                    align="center"
                    gutterBottom
                  >
                    Quiz Finished!
                  </Typography>
                  <Typography variant="h6" align="center" gutterBottom>
                    You scored{" "}
                    <Typography
                      component="span"
                      color="primary.main"
                      fontWeight={800}
                    >
                      {score}
                    </Typography>{" "}
                    out of {totalPoints}
                  </Typography>

                  <Stack
                    direction="row"
                    justifyContent="center"
                    sx={{ mt: 1 }}
                    spacing={1.5}
                  >
                    <Button variant="contained" onClick={() => navigate("/")}>
                      Home
                    </Button>
                  </Stack>

                  <Box sx={{ mt: { xs: 1, md: 3 } }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      gutterBottom
                    >
                      Review
                    </Typography>
                    {quiz.map((q, i) => (
                      <Paper
                        key={q.id}
                        variant="outlined"
                        sx={{ p: 1.5, mb: 1 }}
                      >
                        <Typography fontWeight={700}>
                          {i + 1}. {q.question}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Correct answer: {q.options[q.correctIndex]}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={1800}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert variant="filled" severity="success" sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
