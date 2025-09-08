import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
  MenuItem,
  Select,
  Snackbar,
  Alert,
} from "@mui/material";
import { baseUrl } from "../../components/constant/constant.js";
import { useAuth } from "../../context/AuthContext.jsx";

const DAYS = [
  { key: "day1", label: "Day 1" },
  { key: "day2", label: "Day 2" },
  { key: "day3", label: "Day 3" },
];

export default function WordSearch() {
  const auth = useAuth();
  const uuid = auth?.user?.uuid || localStorage.getItem("ap_uuid") || "";

  const [currentDay, setCurrentDay] = useState("day1");
  const [loading, setLoading] = useState(true);
  const [loadingGame, setLoadingGame] = useState(true);
  const [error, setError] = useState("");
  const [gameData, setGameData] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [score, setScore] = useState(0);
  const [snack, setSnack] = useState({ open: false, message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submittedScore, setSubmittedScore] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const gridRef = useRef(null);
  const isSelecting = useRef(false);
  const startCell = useRef(null);

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
        if (!ignore) setCurrentDay(String(data?.currentDay || "day1"));
      } catch (e) {
        setError(e.message || "Failed to load settings");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Check if game is completed
  useEffect(() => {
    const completionKey = `ap_wordsearch_${currentDay}_completed`;
    setIsCompleted(localStorage.getItem(completionKey) === "true");
  }, [currentDay]);

  // 2) Load word search for the selected day
  useEffect(() => {
    let ignore = false;
    if (!uuid || isCompleted) return;
    (async () => {
      try {
        setLoadingGame(true);
        setError("");
        setGameData(null);
        setSelectedCells([]);
        setFoundWords([]);
        setScore(0);
        setSubmittedScore(null);

        const url = new URL(`${baseUrl}/api/admin/game/content`);
        url.searchParams.set("day", currentDay);
        url.searchParams.set("game", "wordSearch");
        url.searchParams.set("uuid", uuid);
        if (currentDay === "day2" || currentDay === "day3") {
          const color = localStorage.getItem("ap_group_color");
          if (color) url.searchParams.set("groupKey", color);
        }

        const res = await fetch(url.toString());
        if (!res.ok) {
          const msg =
            (await res.json().catch(() => ({})))?.message ||
            "Failed to load word search";
          throw new Error(msg);
        }
        const payload = await res.json();
        const data = payload?.data;
        if (!data) throw new Error("No word search data");

        setGameData(data);
      } catch (e) {
        setError(e.message || "Failed to load word search");
      } finally {
        if (!ignore) setLoadingGame(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [uuid, currentDay, isCompleted]);

  const showSnack = (msg) => setSnack({ open: true, message: msg });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const getCellKey = (r, c) => `${r}-${c}`;

  const isCellSelected = (r, c) =>
    selectedCells.some((cell) => cell.r === r && cell.c === c);

  const isCellFound = (r, c) => {
    return foundWords.some((word) => {
      return word.positions.some((pos) => pos.r === r && pos.c === c);
    });
  };

  const handleMouseDown = (r, c) => {
    if (!gameData) return;

    // Validate coordinates
    if (
      r < 0 ||
      r >= gameData.grid.length ||
      c < 0 ||
      c >= gameData.grid[0].length
    ) {
      console.warn("Invalid grid coordinates");
      return;
    }

    isSelecting.current = true;
    startCell.current = { r, c };
    setSelectedCells([{ r, c }]);
  };

  const handleMouseEnter = (r, c) => {
    if (!isSelecting.current || !startCell.current) return;

    // Validate coordinates
    if (
      r < 0 ||
      r >= gameData.grid.length ||
      c < 0 ||
      c >= gameData.grid[0].length
    ) {
      return;
    }

    const start = startCell.current;
    const cells = [];

    // Determine direction
    const dr = r - start.r;
    const dc = c - start.c;

    // Limit selection to reasonable word lengths (max 15 characters)
    const maxLength = Math.max(Math.abs(dr), Math.abs(dc));
    if (maxLength > 15) return;

    if (dr === 0 && dc === 0) {
      cells.push({ r, c });
    } else if (dr === 0) {
      // Horizontal
      const step = dc > 0 ? 1 : -1;
      for (let i = 0; i <= Math.abs(dc); i++) {
        const newC = start.c + i * step;
        if (newC >= 0 && newC < gameData.grid[0].length) {
          cells.push({ r: start.r, c: newC });
        }
      }
    } else if (dc === 0) {
      // Vertical
      const step = dr > 0 ? 1 : -1;
      for (let i = 0; i <= Math.abs(dr); i++) {
        const newR = start.r + i * step;
        if (newR >= 0 && newR < gameData.grid.length) {
          cells.push({ r: newR, c: start.c });
        }
      }
    } else if (Math.abs(dr) === Math.abs(dc)) {
      // Diagonal
      const stepR = dr > 0 ? 1 : -1;
      const stepC = dc > 0 ? 1 : -1;
      for (let i = 0; i <= Math.abs(dr); i++) {
        const newR = start.r + i * stepR;
        const newC = start.c + i * stepC;
        if (
          newR >= 0 &&
          newR < gameData.grid.length &&
          newC >= 0 &&
          newC < gameData.grid[0].length
        ) {
          cells.push({ r: newR, c: newC });
        }
      }
    }

    setSelectedCells(cells);
  };

  const handleMouseUp = () => {
    if (!isSelecting.current || !gameData) return;

    isSelecting.current = false;

    // Check if selected cells form a found word
    const selectedText = selectedCells
      .map((cell) => gameData.grid[cell.r][cell.c])
      .join("");

    const foundWord = gameData.words.find(
      (word) =>
        word.word === selectedText.toUpperCase() &&
        !foundWords.some((fw) => fw.word === word.word)
    );

    if (foundWord) {
      setFoundWords((prev) => [...prev, foundWord]);
      setScore((prev) => prev + 10);
      showSnack(`Found: "${foundWord.word}" +10`);
    }

    setSelectedCells([]);
    startCell.current = null;
  };

  const submit = async () => {
    if (!uuid) {
      setError("Missing user UUID");
      return;
    }

    // Prevent multiple submissions
    if (submitting || submittedScore !== null) {
      return;
    }

    // Rate limiting: prevent rapid submissions
    const lastSubmitKey = `ap_wordsearch_last_submit_${currentDay}`;
    const lastSubmit = localStorage.getItem(lastSubmitKey);
    const now = Date.now();
    if (lastSubmit && now - parseInt(lastSubmit) < 5000) {
      // 5 second cooldown
      setError("Please wait before submitting again");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      // Validate score (prevent negative or unreasonably high scores)
      const validatedScore = Math.max(0, Math.min(score, 1000)); // reasonable bounds

      const res = await fetch(`${baseUrl}/api/asian-paint/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid: uuid.replace(/[^a-zA-Z0-9-_]/g, ""), // sanitize UUID
          game: "wordSearch",
          day: currentDay.replace(/[^a-zA-Z0-9]/g, ""), // sanitize day
          points: validatedScore,
        }),
      });
      if (!res.ok) {
        const msg =
          (await res.json().catch(() => ({})))?.message ||
          "Failed to save score";
        throw new Error(msg);
      }
      setSubmittedScore(validatedScore);
      localStorage.setItem(lastSubmitKey, now.toString());

      // Mark as completed
      const completionKey = `ap_wordsearch_${currentDay}_completed`;
      localStorage.setItem(completionKey, "true");
      setIsCompleted(true);
    } catch (e) {
      setError(e.message || "Failed to save score");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 3 }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h3" fontWeight={800} color="warning.main">
          Word Search
        </Typography>
        <Chip label={currentDay?.toUpperCase()} />

        {(loading || loadingGame) && (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={60} />
            <Typography sx={{ mt: 2 }} variant="body2" color="text.secondary">
              {loading ? "Loading settings…" : "Loading word search…"}
            </Typography>
            <Typography sx={{ mt: 1 }} variant="caption" color="text.secondary">
              Please wait while we prepare your game
            </Typography>
          </Stack>
        )}

        {!loading && !loadingGame && error && (
          <Stack spacing={2} sx={{ py: 4, alignItems: "center" }}>
            <Typography color="error" variant="h6">
              Oops! Something went wrong
            </Typography>
            <Typography color="error">{error}</Typography>
            <Typography variant="body2" color="text.secondary">
              Try switching the day or come back later.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </Stack>
        )}

        {!loading && !loadingGame && !error && !gameData && (
          <Typography sx={{ py: 4 }}>
            No word search available for this day.
          </Typography>
        )}

        {!loading && !loadingGame && !error && gameData && (
          <>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={
                  <Box sx={{ fontWeight: 700 }}>
                    Score:{" "}
                    <Box component="span" color="warning.main">
                      {score}
                    </Box>
                  </Box>
                }
                variant="outlined"
                sx={{ fontSize: 16, px: 1.25, py: 1 }}
              />
              <Button
                variant="contained"
                onClick={submit}
                disabled={submitting}
              >
                {submittedScore == null ? "Submit" : "Submitted"}
              </Button>
            </Stack>

            {submittedScore != null && (
              <Typography sx={{ mt: 1 }} color="success.main">
                Saved! Final Score: {submittedScore}
              </Typography>
            )}

            {isCompleted && !submittedScore && (
              <Typography sx={{ mt: 1 }} color="warning.main">
                You have already completed this word search for{" "}
                {currentDay.toUpperCase()}.
              </Typography>
            )}

            <Grid container spacing={3} sx={{ width: "100%", maxWidth: 1200 }}>
              {/* LEFT: Grid */}
              <Grid item xs={12} md={8}>
                <Paper elevation={6} sx={{ p: 2 }}>
                  <Box
                    ref={gridRef}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${gameData.grid[0].length}, 40px)`,
                      gridAutoRows: "40px",
                      gap: 1,
                      userSelect: "none",
                    }}
                    onMouseLeave={() => {
                      if (isSelecting.current) {
                        handleMouseUp();
                      }
                    }}
                  >
                    {gameData.grid.map((row, r) =>
                      row.map((letter, c) => (
                        <Box
                          key={getCellKey(r, c)}
                          sx={{
                            width: 40,
                            height: 40,
                            border: 1,
                            borderColor: "divider",
                            bgcolor: isCellFound(r, c)
                              ? "success.light"
                              : isCellSelected(r, c)
                              ? "warning.light"
                              : "background.paper",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "1.2rem",
                            cursor: "pointer",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                          onMouseDown={() => handleMouseDown(r, c)}
                          onMouseEnter={() => handleMouseEnter(r, c)}
                          onMouseUp={handleMouseUp}
                        >
                          {letter}
                        </Box>
                      ))
                    )}
                  </Box>
                </Paper>
              </Grid>

              {/* RIGHT: Words List */}
              <Grid item xs={12} md={4}>
                <Paper elevation={6} sx={{ p: 2 }}>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    color="warning.main"
                    sx={{ mb: 2 }}
                  >
                    Words to Find ({foundWords.length}/{gameData.words.length})
                  </Typography>
                  <Stack spacing={1}>
                    {gameData.words.map((word, index) => {
                      const found = foundWords.some(
                        (fw) => fw.word === word.word
                      );
                      return (
                        <Box
                          key={index}
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor: found
                              ? "success.light"
                              : "background.paper",
                            textDecoration: found ? "line-through" : "none",
                            color: found ? "success.dark" : "text.primary",
                          }}
                        >
                          <Typography variant="body1" fontWeight={600}>
                            {word.word}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Stack>

      <Snackbar open={snack.open} autoHideDuration={1800} onClose={closeSnack}>
        <Alert
          onClose={closeSnack}
          variant="filled"
          severity="success"
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
