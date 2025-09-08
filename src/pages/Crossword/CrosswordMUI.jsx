import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Alert,
  Stack,
  Typography,
} from "@mui/material";
import { baseUrl } from "../../components/constant/constant.js";
import { useAuth } from "../../context/AuthContext.jsx";

// Utilities
const isBlack = (solution, r, c) => solution[r][c] === " ";

function assignNumbers(puzzle) {
  const hasNumbers = [
    ...(puzzle.clues.across || []),
    ...(puzzle.clues.down || []),
  ].some((c) => c.number != null);
  if (hasNumbers) return puzzle;

  let number = 1;
  const across = (puzzle.clues.across || []).map((c) => ({ ...c }));
  const down = (puzzle.clues.down || []).map((c) => ({ ...c }));
  const startNumbers = new Map(); // "r,c" -> number

  const N = puzzle.gridSize;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isBlack(puzzle.solution, r, c)) continue;

      const startsAcross =
        (c === 0 || isBlack(puzzle.solution, r, c - 1)) &&
        c + 1 < N &&
        !isBlack(puzzle.solution, r, c + 1);
      const startsDown =
        (r === 0 || isBlack(puzzle.solution, r - 1, c)) &&
        r + 1 < N &&
        !isBlack(puzzle.solution, r + 1, c);

      if (startsAcross || startsDown) {
        startNumbers.set(`${r},${c}`, number++);
      }
    }
  }

  across.forEach((c) => {
    const n = startNumbers.get(`${c.row},${c.col}`);
    if (n) c.number = n;
  });
  down.forEach((c) => {
    const n = startNumbers.get(`${c.row},${c.col}`);
    if (n) c.number = n;
  });

  return { ...puzzle, clues: { across, down } };
}

function getClueNumberAtCell(puzzle, r, c) {
  const ac = puzzle.clues.across.find(
    (k) => k.row === r && k.col === c
  )?.number;
  const dn = puzzle.clues.down.find((k) => k.row === r && k.col === c)?.number;
  return ac ?? dn ?? null;
}

const DAYS = [
  { key: "day1", label: "Day 1" },
  { key: "day2", label: "Day 2" },
  { key: "day3", label: "Day 3" },
];

export default function CrosswordMUI() {
  const auth = useAuth();
  const uuid = auth?.user?.uuid || localStorage.getItem("ap_uuid") || "";

  const [currentDay, setCurrentDay] = useState("day1");
  const [loading, setLoading] = useState(true);
  const [loadingPuzzle, setLoadingPuzzle] = useState(true);
  const [error, setError] = useState("");
  const [puzzle, setPuzzle] = useState(null);
  const [grid, setGrid] = useState([]);
  const [score, setScore] = useState(0);
  const [solvedWords, setSolvedWords] = useState([]);
  const [snack, setSnack] = useState({ open: false, message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submittedScore, setSubmittedScore] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const inputRefs = useRef([]);
  const lastFocusRef = useRef({ r: 0, c: 0 });

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
    const completionKey = `ap_crossword_${currentDay}_completed`;
    setIsCompleted(localStorage.getItem(completionKey) === "true");
  }, [currentDay]);

  // 2) Load puzzle for the selected day
  useEffect(() => {
    let ignore = false;
    if (!uuid || isCompleted) return;
    (async () => {
      try {
        setLoadingPuzzle(true);
        setError("");
        setPuzzle(null);
        setGrid([]);
        setScore(0);
        setSolvedWords([]);
        setSubmittedScore(null);

        const url = new URL(`${baseUrl}/api/admin/game/content`);
        url.searchParams.set("day", currentDay);
        url.searchParams.set("game", "crossword");
        url.searchParams.set("uuid", uuid);
        if (currentDay === "day2" || currentDay === "day3") {
          const color = localStorage.getItem("ap_group_color");
          if (color) url.searchParams.set("groupKey", color);
        }

        const res = await fetch(url.toString());
        if (!res.ok) {
          const msg =
            (await res.json().catch(() => ({})))?.message ||
            "Failed to load crossword";
          throw new Error(msg);
        }
        const payload = await res.json();
        const p = payload?.data;
        if (!p) throw new Error("No crossword data");

        const processed = assignNumbers(p);
        setPuzzle(processed);
        setGrid(
          Array.from({ length: processed.gridSize }, () =>
            Array(processed.gridSize).fill("")
          )
        );
        inputRefs.current = Array.from({ length: processed.gridSize }, () =>
          Array(processed.gridSize).fill(null)
        );
        lastFocusRef.current = { r: 0, c: 0 };
      } catch (e) {
        setError(e.message || "Failed to load crossword");
      } finally {
        if (!ignore) setLoadingPuzzle(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [uuid, currentDay, isCompleted]);

  const showSolved = (msg) => setSnack({ open: true, message: msg });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const markSolvedIfAny = (updatedGrid) => {
    if (!puzzle) return;
    const newly = [];

    // across
    puzzle.clues.across.forEach((clue) => {
      if (solvedWords.includes(clue.answer)) return;
      let ok = true;
      for (let i = 0; i < clue.length; i++) {
        const v = updatedGrid[clue.row]?.[clue.col + i] || "";
        if (v.toUpperCase() !== clue.answer[i]) {
          ok = false;
          break;
        }
      }
      if (ok) newly.push(clue.answer);
    });

    // down
    puzzle.clues.down.forEach((clue) => {
      if (solvedWords.includes(clue.answer)) return;
      let ok = true;
      for (let i = 0; i < clue.length; i++) {
        const v = updatedGrid[clue.row + i]?.[clue.col] || "";
        if (v.toUpperCase() !== clue.answer[i]) {
          ok = false;
          break;
        }
      }
      if (ok) newly.push(clue.answer);
    });

    if (newly.length > 0) {
      const unique = [...new Set(newly)];
      setSolvedWords((prev) => [...prev, ...unique]);
      setScore((prev) => prev + unique.length * 10);
      unique.forEach((w) => showSolved(`Solved: "${w}"  +10`));
    }
  };

  const handleInputChange = (e, r, c) => {
    if (!puzzle) return;

    // Sanitize input: only allow single letter, uppercase
    const raw = e.target.value.slice(-1); // last char only
    const value = raw.toUpperCase().replace(/[^A-Z]/g, ""); // letters only, prevent XSS

    // Additional validation: ensure we're within grid bounds
    if (r < 0 || r >= puzzle.gridSize || c < 0 || c >= puzzle.gridSize) {
      console.warn("Invalid grid coordinates");
      return;
    }

    // Prevent input in black cells
    if (isBlack(puzzle.solution, r, c)) {
      return;
    }

    // Decide next focus target before state update
    if (value) {
      let target = { r, c };
      // prefer right, then down
      for (let nc = c + 1; nc < puzzle.gridSize; nc++) {
        if (!isBlack(puzzle.solution, r, nc)) {
          target = { r, c: nc };
          break;
        }
      }
      if (target.c === c) {
        for (let nr = r + 1; nr < puzzle.gridSize; nr++) {
          if (!isBlack(puzzle.solution, nr, c)) {
            target = { r: nr, c };
            break;
          }
        }
      }
      lastFocusRef.current = target;
    } else {
      lastFocusRef.current = { r, c };
    }

    const newGrid = grid.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? value : cell))
    );
    setGrid(newGrid);
    markSolvedIfAny(newGrid);
  };

  const handleKeyDown = (e, r, c) => {
    if (!puzzle) return;
    const N = puzzle.gridSize;

    if (e.key === "Backspace" && !grid[r][c]) {
      e.preventDefault();
      // previous focus (left, then up)
      let target = { r, c };
      for (let nc = c - 1; nc >= 0; nc--) {
        if (!isBlack(puzzle.solution, r, nc)) {
          target = { r, c: nc };
          break;
        }
      }
      if (target.c === c) {
        for (let nr = r - 1; nr >= 0; nr--) {
          if (!isBlack(puzzle.solution, nr, c)) {
            target = { r: nr, c };
            break;
          }
        }
      }
      lastFocusRef.current = target;
      // ensure focus after event handling
      setTimeout(() => inputRefs.current[target.r]?.[target.c]?.focus?.(), 0);
    } else if (e.key === "ArrowRight" && c < N - 1) {
      e.preventDefault();
      for (let nc = c + 1; nc < N; nc++) {
        if (!isBlack(puzzle.solution, r, nc)) {
          lastFocusRef.current = { r, c: nc };
          inputRefs.current[r][nc]?.focus();
          break;
        }
      }
    } else if (e.key === "ArrowLeft" && c > 0) {
      e.preventDefault();
      for (let nc = c - 1; nc >= 0; nc--) {
        if (!isBlack(puzzle.solution, r, nc)) {
          lastFocusRef.current = { r, c: nc };
          inputRefs.current[r][nc]?.focus();
          break;
        }
      }
    } else if (e.key === "ArrowDown" && r < N - 1) {
      e.preventDefault();
      for (let nr = r + 1; nr < N; nr++) {
        if (!isBlack(puzzle.solution, nr, c)) {
          lastFocusRef.current = { r: nr, c };
          inputRefs.current[nr][c]?.focus();
          break;
        }
      }
    } else if (e.key === "ArrowUp" && r > 0) {
      e.preventDefault();
      for (let nr = r - 1; nr >= 0; nr--) {
        if (!isBlack(puzzle.solution, nr, c)) {
          lastFocusRef.current = { r: nr, c };
          inputRefs.current[nr][c]?.focus();
          break;
        }
      }
    }
  };

  const handleClueClick = (clue) => {
    lastFocusRef.current = { r: clue.row, c: clue.col };
    inputRefs.current[clue.row]?.[clue.col]?.focus();
  };

  const resetGame = () => {
    if (!puzzle) return;
    setGrid(
      Array.from({ length: puzzle.gridSize }, () =>
        Array(puzzle.gridSize).fill("")
      )
    );
    setScore(0);
    setSolvedWords([]);
    lastFocusRef.current = { r: 0, c: 0 };
    // focus after paint
    setTimeout(() => inputRefs.current[0]?.[0]?.focus?.(), 0);
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
    const lastSubmitKey = `ap_crossword_last_submit_${currentDay}`;
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
          game: "crossword",
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
      const completionKey = `ap_crossword_${currentDay}_completed`;
      localStorage.setItem(completionKey, "true");
      setIsCompleted(true);
    } catch (e) {
      setError(e.message || "Failed to save score");
    } finally {
      setSubmitting(false);
    }
  };

  // Render
  const cellSize = "clamp(36px, 7.5vw, 56px)";

  const GridCell = React.memo(function GridCell({ r, c }) {
    if (!puzzle) return null;
    const black = isBlack(puzzle.solution, r, c);
    const n = getClueNumberAtCell(puzzle, r, c);

    return (
      <Box
        sx={{
          position: "relative",
          width: cellSize,
          height: cellSize,
          border: 1,
          borderColor: "divider",
          bgcolor: black ? "grey.900" : "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!!n && !black && (
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              top: 2,
              left: 4,
              fontWeight: 700,
              color: "text.secondary",
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            {n}
          </Typography>
        )}

        {!black && (
          <InputBase
            inputRef={(el) => (inputRefs.current[r][c] = el)}
            onFocus={() => (lastFocusRef.current = { r, c })}
            value={grid[r]?.[c] || ""}
            onChange={(e) => handleInputChange(e, r, c)}
            onKeyDown={(e) => handleKeyDown(e, r, c)}
            inputProps={{
              maxLength: 1,
              "aria-label": `Row ${r + 1} Column ${c + 1}`,
              style: {
                textAlign: "center",
                fontWeight: 800,
                textTransform: "uppercase",
                fontSize: "1.1rem",
                width: "100%",
              },
            }}
            sx={{
              width: "100%",
              height: "100%",
            }}
          />
        )}
      </Box>
    );
  });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 3 }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h3" fontWeight={800} color="warning.main">
          Crossword
        </Typography>
        <Chip label={currentDay?.toUpperCase()} />

        {(loading || loadingPuzzle) && (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={60} />
            <Typography sx={{ mt: 2 }} variant="body2" color="text.secondary">
              {loading ? "Loading settings…" : "Loading crossword…"}
            </Typography>
            <Typography sx={{ mt: 1 }} variant="caption" color="text.secondary">
              Please wait while we prepare your game
            </Typography>
          </Stack>
        )}

        {!loading && !loadingPuzzle && error && (
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

        {!loading && !loadingPuzzle && !error && !puzzle && (
          <Typography sx={{ py: 4 }}>
            No crossword available for this day.
          </Typography>
        )}

        {!loading && !loadingPuzzle && !error && puzzle && (
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
              <Button variant="outlined" onClick={resetGame}>
                Reset
              </Button>
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
                You have already completed this crossword for{" "}
                {currentDay.toUpperCase()}.
              </Typography>
            )}

            <Grid container spacing={3} sx={{ width: "100%", maxWidth: 1100 }}>
              {/* LEFT: Grid */}
              <Grid item xs={12} md={6}>
                <Paper elevation={6} sx={{ p: 1.5 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${puzzle.gridSize}, ${cellSize})`,
                      gridAutoRows: cellSize,
                    }}
                  >
                    {Array.from({ length: puzzle.gridSize }).map((_, r) =>
                      Array.from({ length: puzzle.gridSize }).map((__, c) => (
                        <GridCell key={`${r}-${c}`} r={r} c={c} />
                      ))
                    )}
                  </Box>
                </Paper>
              </Grid>

              {/* RIGHT: Clues */}
              <Grid item xs={12} md={6}>
                <Paper elevation={6} sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="h5"
                        fontWeight={800}
                        color="warning.main"
                        sx={{ mb: 1 }}
                      >
                        Across
                      </Typography>
                      <List dense disablePadding>
                        {puzzle.clues.across.map((clue) => {
                          const solved = solvedWords.includes(clue.answer);
                          return (
                            <ListItemButton
                              key={`A-${clue.number}-${clue.answer}`}
                              onClick={() => handleClueClick(clue)}
                              sx={{ borderRadius: 1, mb: 0.5 }}
                            >
                              <ListItemText
                                primary={
                                  <Box
                                    sx={{
                                      display: "flex",
                                      gap: 1,
                                      alignItems: "baseline",
                                      textDecoration: solved
                                        ? "line-through"
                                        : "none",
                                      color: solved
                                        ? "success.main"
                                        : "text.primary",
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 700, minWidth: 26 }}
                                    >
                                      {clue.number}.
                                    </Typography>
                                    <Typography variant="body2">
                                      {clue.clue}
                                    </Typography>
                                  </Box>
                                }
                                secondary={`(${clue.answer.length})`}
                              />
                            </ListItemButton>
                          );
                        })}
                      </List>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="h5"
                        fontWeight={800}
                        color="warning.main"
                        sx={{ mb: 1 }}
                      >
                        Down
                      </Typography>
                      <List dense disablePadding>
                        {puzzle.clues.down.map((clue) => {
                          const solved = solvedWords.includes(clue.answer);
                          return (
                            <ListItemButton
                              key={`D-${clue.number}-${clue.answer}`}
                              onClick={() => handleClueClick(clue)}
                              sx={{ borderRadius: 1, mb: 0.5 }}
                            >
                              <ListItemButton
                                key={`D-${clue.number}-${clue.answer}`}
                                onClick={() => handleClueClick(clue)}
                                sx={{ borderRadius: 1, mb: 0.5 }}
                              >
                                <ListItemText
                                  primary={
                                    <Box
                                      sx={{
                                        display: "flex",
                                        gap: 1,
                                        alignItems: "baseline",
                                        textDecoration: solved
                                          ? "line-through"
                                          : "none",
                                        color: solved
                                          ? "success.main"
                                          : "text.primary",
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 700, minWidth: 26 }}
                                      >
                                        {clue.number}.
                                      </Typography>
                                      <Typography variant="body2">
                                        {clue.clue}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={`(${clue.answer.length})`}
                                />
                              </ListItemButton>
                            </ListItemButton>
                          );
                        })}
                      </List>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Tip: Click a clue to jump to its starting cell. Use arrow
                    keys to move.
                  </Typography>
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
