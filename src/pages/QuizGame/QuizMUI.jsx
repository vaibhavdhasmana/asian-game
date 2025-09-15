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
  IconButton,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HomeIcon from "@mui/icons-material/Home";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import useGameSettings from "../../hooks/useGameSettings";
import { baseUrl } from "../../components/constant/constant";
import NextRoundNotice from "../../components/NextRoundNotice/NextRoundNotice";

const DEFAULT_TIMER_SECONDS = 30;
const POINTS_PER_CORRECT = 10; // for UI only; server computes real score

// use shared baseUrl

export default function QuizMUI() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gs = useGameSettings() || {};
  const queryDay = (searchParams.get("day") || "").toLowerCase();
  const rawDay =
    gs.activeDay ||
    gs.day ||
    gs.currentDay ||
    gs.gameDay ||
    gs.settings?.activeDay ||
    gs.settings?.day ||
    "day1";
  const dayKey = useMemo(() => {
    const v = queryDay || String(rawDay).toLowerCase();
    return ["day1", "day2", "day3"].includes(v) ? v : "day1";
  }, [queryDay, rawDay]);
  const slot = useMemo(() => {
    const s = parseInt(searchParams.get("slot"), 10);
    if (Number.isFinite(s) && s > 0) return s;
    return Number(gs.currentSlot) || 1;
  }, [searchParams, gs.currentSlot]);

  const KEYS = useMemo(
    () => ({
      user: "ap_user",
      state: `ap_quiz_state_${dayKey}_s${slot}`,
      done: `ap_quiz_completed_${dayKey}_s${slot}`,
    }),
    [dayKey, slot]
  );

  // Remote content
  const [contentVersion, setContentVersion] = useState(0);
  const [quiz, setQuiz] = useState([]);
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_SECONDS);

  // Game state
  const [qIndex, setQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_TIMER_SECONDS);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState(null); // 'correct' | 'wrong' | 'timeout' | null
  const [finished, setFinished] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "" });
  const [serverLockChecked, setServerLockChecked] = useState(false);

  const [answers, setAnswers] = useState([]);

  const intervalRef = useRef(null);
  const autoNextRef = useRef(null);
  const resumeSecRef = useRef(null);

  // Load content (with fallback to local static if desired)
  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("ap_user") || "null");
        const uuid = user?.uuid || user?.uniqueNo;
        const { data } = await axios.get(`${baseUrl}/api/asian-paint/content`, {
          params: { day: dayKey, game: "quiz", uuid, slot },
        });
        const qs = data?.payload?.questions || [];
        setQuiz(qs);
        setContentVersion(data?.version || 0);
        const t = Number(
          data?.payload?.timeLimit ||
            data?.payload?.timerSeconds ||
            DEFAULT_TIMER_SECONDS
        );
        setTimerSeconds(isFinite(t) && t > 0 ? t : DEFAULT_TIMER_SECONDS);
      } catch {
        // fallback: keep empty; admin must upload content
        setQuiz([]);
        setContentVersion(0);
        setTimerSeconds(DEFAULT_TIMER_SECONDS);
      }
    })();
  }, [dayKey, slot]);

  // Prepare answers array
  useEffect(() => {
    setAnswers(Array.from({ length: quiz.length }, () => -1));
  }, [quiz]);

  // Server lock (one play/day)
  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
        const uuid = user?.uuid || user?.uniqueNo;
        if (!uuid) {
          setAlreadySubmitted(false);
          setServerLockChecked(true);
          return;
        }
        const { data } = await axios.get(
          `${baseUrl}/api/asian-paint/score/status`,
          {
            params: { uuid, game: "quiz", day: dayKey, slot },
          }
        );
        if (data?.submitted) {
          localStorage.setItem(KEYS.done, "true");
          setAlreadySubmitted(true);
          // Do not force finished UI on refresh; keep quiz screen locked instead
          if (typeof data.points === "number") {
            setScore(Number(data.points) || 0);
          }
        } else {
          localStorage.removeItem(KEYS.done);
          setAlreadySubmitted(false);
        }
      } catch {
        const localDone = localStorage.getItem(KEYS.done) === "true";
        setAlreadySubmitted(localDone);
        if (localDone) setFinished(true);
      } finally {
        setServerLockChecked(true);
      }
    })();
  }, [dayKey, slot, KEYS.user, KEYS.done]);

  // On day/slot change, reset lock flags until status/content are refetched
  useEffect(() => {
    setServerLockChecked(false);
    setAlreadySubmitted(false);
    setFinished(false);
  }, [dayKey, slot]);

  // Load local progress (resume where left using qIndex + answers + secondsLeft if unanswered)
  useEffect(() => {
    if (!serverLockChecked || alreadySubmitted) return;
    try {
      const raw = localStorage.getItem(KEYS.state);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.answers)) setAnswers(saved.answers);
      if (typeof saved.qIndex === "number") setQIndex(saved.qIndex);
      // If we have secondsLeft saved for an unanswered question, keep it to apply on timer init
      if (
        typeof saved.secondsLeft === "number" &&
        Array.isArray(saved.answers) &&
        typeof saved.qIndex === "number"
      ) {
        const ans = saved.answers[saved.qIndex];
        const isAnswered = typeof ans === "number" && ans >= 0;
        if (!isAnswered) {
          const sec = Math.max(0, saved.secondsLeft);
          // Prime both a ref (used by timer effect) and state so UI shows the right value even if effects interleave
          resumeSecRef.current = sec;
          setSecondsLeft(sec);
        }
      }
    } catch {}
  }, [serverLockChecked, alreadySubmitted, KEYS.state]);

  // Timer (reset per question; recompute locked from answers)
  useEffect(() => {
    if (!serverLockChecked || finished || alreadySubmitted || quiz.length === 0)
      return;
    clearInterval(intervalRef.current);

    // Derive current state from saved answers
    const ans = answers[qIndex];
    const isAnswered = typeof ans === "number" && ans >= 0;
    const correct = isAnswered && ans === quiz[qIndex]?.correctIndex;

    setSelected(isAnswered ? ans : null);
    setLocked(isAnswered);
    setStatus(isAnswered ? (correct ? "correct" : "wrong") : null);

    // Recompute score from all answers so far
    const s = answers.reduce(
      (acc, a, i) =>
        acc + (a === quiz[i]?.correctIndex ? POINTS_PER_CORRECT : 0),
      0
    );
    setScore(s);

    // Always start each new (unanswered) question from default timer unless restoring this question specifically
    let startSec;
    if (!isAnswered) {
      if (
        typeof resumeSecRef.current === "number" &&
        resumeSecRef.current >= 0
      ) {
        // restore exact time only for the same question (e.g., after refresh)
        startSec = Math.min(timerSeconds, Math.max(0, resumeSecRef.current));
      } else {
        startSec = timerSeconds;
      }
      resumeSecRef.current = null;
    } else {
      // answered/locked questions keep whatever (timer won't run)
      startSec = secondsLeft;
    }
    setSecondsLeft(startSec);
    if (!isAnswered) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((sec) => {
          if (sec <= 1) {
            clearInterval(intervalRef.current);
            setLocked(true);
            setStatus("timeout");
            autoNextRef.current = setTimeout(() => handleNext(), 1200);
            return 0;
          }
          return sec - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(autoNextRef.current);
    };
  }, [
    qIndex,
    finished,
    serverLockChecked,
    timerSeconds,
    quiz.length,
    answers,
    quiz,
  ]);

  useEffect(
    () => () => {
      clearInterval(intervalRef.current);
      clearTimeout(autoNextRef.current);
    },
    []
  );

  // Flush on unmount/route change (captures latest values)
  useEffect(() => {
    if (!serverLockChecked || finished) return;
    return () => {
      try {
        localStorage.setItem(
          KEYS.state,
          JSON.stringify({ qIndex, answers, secondsLeft })
        );
      } catch {}
    };
  }, [serverLockChecked, finished, qIndex, answers, secondsLeft, KEYS.state]);

  // Persist progress (minimal: qIndex + answers + secondsLeft)
  useEffect(() => {
    if (!serverLockChecked || finished) return;
    localStorage.setItem(
      KEYS.state,
      JSON.stringify({ qIndex, answers, secondsLeft })
    );
  }, [qIndex, answers, finished, KEYS.state, serverLockChecked, secondsLeft]);

  // Flush progress on tab hide/unload for reliability
  useEffect(() => {
    if (!serverLockChecked || finished) return;
    const flush = () => {
      try {
        const snapshot = { qIndex, answers, secondsLeft };
        localStorage.setItem(KEYS.state, JSON.stringify(snapshot));
      } catch {}
    };
    window.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [serverLockChecked, finished, qIndex, answers, secondsLeft, KEYS.state]);

  const current = quiz[qIndex];

  const handleOptionClick = (idx) => {
    if (!serverLockChecked || locked || finished || alreadySubmitted) return;
    setSelected(idx);
    const isCorrect = idx === current?.correctIndex;
    setLocked(true);
    setStatus(isCorrect ? "correct" : "wrong");
    clearInterval(intervalRef.current);
    if (isCorrect) setScore((s) => s + POINTS_PER_CORRECT);
    setAnswers((arr) => {
      const a = arr.slice();
      a[qIndex] = idx;
      return a;
    });
  };

  const handleNext = () => {
    clearTimeout(autoNextRef.current);
    if (finished || alreadySubmitted) return;
    if (qIndex + 1 < quiz.length) setQIndex((i) => i + 1);
    else finishQuiz();
  };

  const submitScore = async () => {
    try {
      const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
      const uuid = user?.uuid || user?.uniqueNo;
      if (!uuid) return;
      await axios.post(`${baseUrl}/api/asian-paint/score/submit`, {
        uuid,
        day: dayKey,
        game: "quiz",
        slot,
        contentVersion,
        payload: { answers },
      });
      setSnack({ open: true, message: "Score submitted!" });
    } catch (e) {
      if (e?.response?.status === 409) {
        setSnack({ open: true, message: "Already submitted" });
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
    localStorage.setItem(KEYS.done, "true");
    localStorage.removeItem(KEYS.state);
    setAlreadySubmitted(true);
    submitScore();
  };

  // Prevent copying/selection/context menu on quiz content while playing
  const preventCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const noCopyHandlers = {
    onContextMenu: preventCopy,
    onCopy: preventCopy,
    onCut: preventCopy,
    onDragStart: preventCopy,
  };

  // Guards
  if (!serverLockChecked) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography>Checking attempt status...</Typography>
      </Box>
    );
  }
  // Dedicated locked screen: user already submitted this slot
  if (alreadySubmitted && !finished) {
    return (
      <Box
        sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}
      >
        <Card sx={{ maxWidth: 520 }}>
          <CardContent>
            <Stack spacing={2} alignItems="center">
              <Typography variant="h6" fontWeight={800} align="center">
                Locked Until Next Round
              </Typography>
              <Typography color="text.secondary" align="center">
                Please wait for the next round to play again.
              </Typography>
              <NextRoundNotice day={dayKey} slot={slot} />
              <Button variant="contained" onClick={() => navigate("/")}>
                Home
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }
  if (!finished && quiz.length === 0) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography>Loading quiz...</Typography>
      </Box>
    );
  }

  const TIMER_SECONDS = timerSeconds; // keep naming used below
  const progressPct = (secondsLeft / TIMER_SECONDS) * 100;
  const qNumber = qIndex + 1;
  const totalPoints = (quiz?.length || 0) * POINTS_PER_CORRECT;
  const dayText = {
    day1: "DAY 1",
    day2: "DAY 2",
    day3: "DAY 3",
    day4: "DAY 4",
  };
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
      {/* Home (top-right) */}
      <IconButton
        aria-label="Home"
        onClick={() => navigate("/")}
        sx={{ position: "fixed", top: 58, right: 12, zIndex: 10 }}
      >
        <HomeIcon />
      </IconButton>
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
              {dayText[dayKey].toUpperCase()} - Quiz
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
                  {POINTS_PER_CORRECT} points per correct · Question{" "}
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
              <Card
                elevation={6}
                {...noCopyHandlers}
                sx={{
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  MsUserSelect: "none",
                  WebkitTouchCallout: "none",
                }}
              >
                <CardHeader
                  title={
                    <Typography
                      sx={{
                        fontSize: { xs: "1rem", md: "1.2rem" },
                        fontWeight: 600,
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        MozUserSelect: "none",
                        MsUserSelect: "none",
                        WebkitTouchCallout: "none",
                      }}
                    >
                      {quiz[qIndex]?.question}
                    </Typography>
                  }
                  subheader={
                    status === "timeout" ? (
                      <Typography color="error">Time's up!</Typography>
                    ) : null
                  }
                />
                <CardContent>
                  <Stack spacing={1.5}>
                    {quiz[qIndex]?.options?.map((opt, idx) => {
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
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            MozUserSelect: "none",
                            MsUserSelect: "none",
                            WebkitTouchCallout: "none",
                          }}
                          fullWidth
                          onContextMenu={preventCopy}
                        >
                          <Box
                            component="span"
                            sx={{
                              mr: 1.25,
                              opacity: 0.7,
                              fontWeight: 800,
                              minWidth: 22,
                              display: "inline-block",
                              userSelect: "none",
                              WebkitUserSelect: "none",
                              MozUserSelect: "none",
                              MsUserSelect: "none",
                              WebkitTouchCallout: "none",
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
                        <Chip color="error" label="Time's up" />
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
                  <Box sx={{ my: 1.5 }}>
                    <NextRoundNotice day={dayKey} slot={slot} />
                  </Box>
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
                        key={q.id ?? i}
                        variant="outlined"
                        sx={{ p: 1.5, mb: 1, userSelect: "none" }}
                        onContextMenu={preventCopy}
                      >
                        <Typography fontWeight={700}>
                          {i + 1}. {q.question}
                        </Typography>
                        {typeof q.correctIndex === "number" &&
                          q.options?.[q.correctIndex] && (
                            <Typography variant="body2" color="text.secondary">
                              Correct answer: {q.options[q.correctIndex]}
                            </Typography>
                          )}
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
