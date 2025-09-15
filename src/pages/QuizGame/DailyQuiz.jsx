// src/components/quiz/DailyQuiz.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { baseUrl } from "../../components/constant/constant.js";
import { useAuth } from "../../context/AuthContext.jsx";

// (Optional) works even if AuthContext isn't wired here
// let safeUseAuth;
// try {
//   // eslint-disable-next-line no-undef
//   const mod = await import("../../context/AuthContext.jsx").catch(() => ({}));
//   safeUseAuth = mod?.useAuth;
// } catch (_) {}

// const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";

const DAYS = [
  { key: "day1", label: "Day 1" },
  { key: "day2", label: "Day 2" },
  { key: "day3", label: "Day 3" },
  { key: "day4", label: "Day 4" },
];

export default function DailyQuiz({
  uuid: uuidProp, // optional override
  defaultDay, // optional: "day1" | "day2" | "day3" | "day4"
  onClose, // optional: if rendered inside a Dialog
  dense = false, // slightly compact UI
}) {
  const auth = useAuth();
  const uuid =
    uuidProp || auth?.user?.uuid || localStorage.getItem("ap_uuid") || "";

  const [currentDay, setCurrentDay] = useState(defaultDay || "day1");
  const [loading, setLoading] = useState(true);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qIndex]: selectedIndex }
  const [submitting, setSubmitting] = useState(false);
  const [submittedScore, setSubmittedScore] = useState(null);

  // 1) Load current day
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${baseUrl}/api/admin/public/settings`);
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        // If no defaultDay prop passed, use server's currentDay
        if (!defaultDay) setCurrentDay(String(data?.currentDay || "day1"));
      } catch (e) {
        setError(e.message || "Failed to load settings");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [defaultDay]);

  // 2) Load quiz for the selected day
  useEffect(() => {
    let ignore = false;
    if (!uuid) return;
    (async () => {
      try {
        setLoadingQuiz(true);
        setError("");
        setQuestions([]);
        setIdx(0);
        setAnswers({});
        setSubmittedScore(null);

        const url = new URL(`${baseUrl}/api/admin/game/content`);
        url.searchParams.set("day", currentDay);
        url.searchParams.set("game", "quiz");
        url.searchParams.set("uuid", uuid);
        const res = await fetch(url.toString());
        if (!res.ok) {
          const msg =
            (await res.json().catch(() => ({})))?.message ||
            "Failed to load quiz";
          throw new Error(msg);
        }
        const payload = await res.json();

        const qs = payload?.data?.questions || [];
        setQuestions(qs);
      } catch (e) {
        setError(e.message || "Failed to load quiz");
      } finally {
        if (!ignore) setLoadingQuiz(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [uuid, currentDay]);

  const total = questions.length;
  const progress = total ? Math.round(((idx + 1) / total) * 100) : 0;

  const score = useMemo(() => {
    // Each correct = 10 marks (per your requirement)
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q?.answerIndex) correct += 1;
    });
    return correct * 10;
  }, [answers, questions]);

  const handleAnswer = (optionIndex) => {
    setAnswers((a) => ({ ...a, [idx]: optionIndex }));
  };

  const next = () => setIdx((i) => Math.min(i + 1, total - 1));
  const prev = () => setIdx((i) => Math.max(i - 1, 0));

  const submit = async () => {
    if (!uuid) {
      setError("Missing user UUID");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`${baseUrl}/api/asian-paint/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid,
          game: "quiz",
          day: currentDay,
          points: score,
        }),
      });
      if (!res.ok) {
        const msg =
          (await res.json().catch(() => ({})))?.message ||
          "Failed to save score";
        throw new Error(msg);
      }
      setSubmittedScore(score);
    } catch (e) {
      setError(e.message || "Failed to save score");
    } finally {
      setSubmitting(false);
    }
  };

  const q = questions[idx];

  return (
    <Paper
      elevation={3}
      sx={{ p: dense ? 2 : 3, maxWidth: 800, width: "100%" }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6">Daily Quiz</Typography>
          <Chip label={currentDay?.toUpperCase()} />
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2">Switch Day</Typography>
          <Select
            size="small"
            value={currentDay}
            onChange={(e) => setCurrentDay(e.target.value)}
          >
            {DAYS.map((d) => (
              <MenuItem key={d.key} value={d.key}>
                {d.label}
              </MenuItem>
            ))}
          </Select>
          {onClose && (
            <IconButton onClick={onClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {(loading || loadingQuiz) && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }} variant="body2">
            Loading quiz…
          </Typography>
        </Stack>
      )}

      {!loading && !loadingQuiz && error && (
        <Stack spacing={2} sx={{ py: 4 }}>
          <Typography color="error">{error}</Typography>
          <Typography variant="body2">
            Try switching the day or come back later.
          </Typography>
        </Stack>
      )}

      {!loading && !loadingQuiz && !error && total === 0 && (
        <Typography sx={{ py: 4 }}>
          No questions available for this day.
        </Typography>
      )}

      {!loading && !loadingQuiz && !error && total > 0 && (
        <Stack spacing={2}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="subtitle2">
            Question {idx + 1} of {total}
          </Typography>

          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {q?.q}
            </Typography>

            <RadioGroup
              value={answers[idx] ?? -1}
              onChange={(_, v) => handleAnswer(Number(v))}
            >
              {q?.options?.map((opt, i) => (
                <FormControlLabel
                  key={i}
                  value={i}
                  control={<Radio />}
                  label={opt}
                />
              ))}
            </RadioGroup>
          </Box>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack direction="row" spacing={1}>
              <Button disabled={idx === 0} onClick={prev} variant="outlined">
                Previous
              </Button>
              <Button
                disabled={idx === total - 1}
                onClick={next}
                variant="outlined"
              >
                Next
              </Button>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={2}>
              <Chip label={`Score: ${score}`} />
              <Button
                variant="contained"
                onClick={submit}
                disabled={submitting}
              >
                {submittedScore == null ? "Submit" : "Submitted"}
              </Button>
            </Stack>
          </Stack>

          {submittedScore != null && (
            <Typography sx={{ mt: 1 }} color="success.main">
              Saved! Final Score: {submittedScore}
            </Typography>
          )}
        </Stack>
      )}
    </Paper>
  );
}
