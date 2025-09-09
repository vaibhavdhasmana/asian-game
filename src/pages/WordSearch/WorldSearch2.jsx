// src/pages/WordSearch/WordSearchMUI.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Grid,
  Paper,
  Alert,
  Snackbar,
  LinearProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useGameSettings from "../../hooks/useGameSettings";
import { baseUrl } from "../../components/constant/constant";

/* ==============================
   CONFIG
   ============================== */
const POINTS_PER_WORD = 10;
// 9Ã—9 grid
const GRID_SIZE = 9;
const GRID_GAP = 4;

// Mobile responsiveness (370px minimum reference)
const MIN_REF_WIDTH = 370;
const MAX_REF_WIDTH = 760;
const CELL_MIN = 26;
const CELL_MAX = 48;

// API base
// use shared baseUrl

// Target words (BUCKINGHAM removed to fit 9Ã—9)
const WORDS = ["TEXTURES", "BRUSHES", "LONDON", "BIGBEN"];

/* ==============================
   Utils
   ============================== */
const toKey = (r, c) => `${r},${c}`;

// seeded RNG (stable grid per day)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

/* ==============================
   Placements for 9Ã—9 (no overlaps)
   ============================== */
const placements = [
  // TEXTURES (8): â†˜ from (0,0) â†’ (7,7)
  { word: "TEXTURES", start: [0, 0], dir: [1, 1] },
  // BRUSHES (7): â†“ from (0,8) â†’ (6,8)
  { word: "BRUSHES", start: [0, 8], dir: [1, 0] },
  // LONDON (6): â†’ from (8,0) â†’ (8,5)
  { word: "LONDON", start: [8, 0], dir: [0, 1] },
  // BIGBEN (6): â†’ from (6,0) â†’ (6,5)
  { word: "BIGBEN", start: [6, 0], dir: [0, 1] },
];

function buildGrid(seedString = "default") {
  const grid = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => "")
  );

  // Place words
  placements.forEach(({ word, start, dir }) => {
    const [sr, sc] = start;
    const [dr, dc] = dir;
    for (let i = 0; i < word.length; i++) {
      const r = sr + dr * i;
      const c = sc + dc * i;
      if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) {
        throw new Error(`Word ${word} goes out of bounds`);
      }
      const existing = grid[r][c];
      if (existing && existing !== word[i]) {
        throw new Error(`Conflict placing ${word} at ${r},${c}`);
      }
      grid[r][c] = word[i];
    }
  });

  // Fill blanks with seeded random A-Z
  const rng = mulberry32(hashString(seedString));
  const A = "A".charCodeAt(0);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) {
        const ch = String.fromCharCode(A + Math.floor(rng() * 26));
        grid[r][c] = ch;
      }
    }
  }
  return grid;
}

/* ==============================
   Component
   ============================== */
export default function WordSearch2() {
  const navigate = useNavigate();

  // Active day from settings (same behavior as Quiz)
  const gs = useGameSettings() || {};
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

  // Keys per day (v3 to invalidate previous caches)
  const KEYS = useMemo(
    () => ({
      user: "ap_user",
      state: `ap_ws_state_${dayKey}_v3`,
      done: `ap_ws_completed_${dayKey}_v3`,
      grid: `ap_ws_grid_${dayKey}_v3`,
    }),
    [dayKey]
  );

  // Server lock (hard lock even if localStorage cleared)
  const [serverLockChecked, setServerLockChecked] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Responsive sizing
  const wrapRef = useRef(null);
  const gridRef = useRef(null); // for touchmove hit-testing
  const [cellPx, setCellPx] = useState(32);
  const [gridWidth, setGridWidth] = useState(MIN_REF_WIDTH);

  const computeSizes = () => {
    const containerWidth = wrapRef.current?.clientWidth || window.innerWidth;
    const refWidth = Math.min(
      Math.max(MIN_REF_WIDTH, containerWidth),
      MAX_REF_WIDTH
    );
    const totalGaps = GRID_GAP * (GRID_SIZE - 1);
    const rawCell = Math.floor((refWidth - totalGaps) / GRID_SIZE);
    const nextCell = Math.max(CELL_MIN, Math.min(CELL_MAX, rawCell));
    const nextGridWidth = nextCell * GRID_SIZE + totalGaps;

    setCellPx(nextCell);
    setGridWidth(Math.min(nextGridWidth, Math.floor(refWidth)));
  };

  useEffect(() => {
    computeSizes();
    window.addEventListener("resize", computeSizes);
    window.addEventListener("orientationchange", computeSizes);
    return () => {
      window.removeEventListener("resize", computeSizes);
      window.removeEventListener("orientationchange", computeSizes);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Game state
  const [grid, setGrid] = useState(() => {
    try {
      const fromLS = localStorage.getItem(KEYS.grid);
      if (fromLS) {
        const parsed = JSON.parse(fromLS);
        if (
          Array.isArray(parsed) &&
          parsed.length === GRID_SIZE &&
          parsed[0].length === GRID_SIZE
        ) {
          return parsed;
        }
      }
    } catch {}
    const g = buildGrid(`ws-${dayKey}-9x9`);
    localStorage.setItem(KEYS.grid, JSON.stringify(g));
    return g;
  });
  const [foundWords, setFoundWords] = useState(() => new Set());
  const [foundCells, setFoundCells] = useState(() => new Set());
  const [score, setScore] = useState(0);

  // Selection + live preview
  const [isDragging, setIsDragging] = useState(false);
  const [selectStart, setSelectStart] = useState(null); // [r,c] | null
  const [selectEnd, setSelectEnd] = useState(null); // [r,c] | null
  const usingTouchRef = useRef(false); // suppress click after touch

  // Touch intent heuristic (to allow vertical scroll when intended)
  const DRAG_THRESHOLD = 8; // px
  const [touchStartXY, setTouchStartXY] = useState(null); // {x,y}

  const [snack, setSnack] = useState({ open: false, message: "" });

  const totalPoints = WORDS.length * POINTS_PER_WORD;
  const finished = foundWords.size === WORDS.length;

  // Helper: find the cell Button regardless of child
  function getCellFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cell = el.closest ? el.closest("[data-r][data-c]") : el;
    const rAttr = cell?.getAttribute?.("data-r");
    const cAttr = cell?.getAttribute?.("data-c");
    if (rAttr == null || cAttr == null) return null;
    return [Number(rAttr), Number(cAttr)];
  }

  /* ---------- SERVER LOCK CHECK ---------- */
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
            params: { uuid, game: "wordSearch", day: dayKey },
          }
        );
        if (data?.submitted) {
          localStorage.setItem(KEYS.done, "true");
          setAlreadySubmitted(true);
          if (typeof data.points === "number") setScore(data.points);
          // mark all found to show Finished state
          setFoundWords(new Set(WORDS));
          try {
            const fromLS = localStorage.getItem(KEYS.grid);
            if (fromLS) setGrid(JSON.parse(fromLS));
          } catch {}
        } else {
          localStorage.removeItem(KEYS.done);
          setAlreadySubmitted(false);
        }
      } catch {
        const localDone = localStorage.getItem(KEYS.done) === "true";
        setAlreadySubmitted(localDone);
        if (localDone) {
          setFoundWords(new Set(WORDS));
          setScore(totalPoints);
        }
      } finally {
        setServerLockChecked(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, KEYS.user, KEYS.done]);

  /* ---------- LOAD LOCAL PROGRESS ---------- */
  useEffect(() => {
    if (!serverLockChecked || alreadySubmitted) return;
    try {
      const raw = localStorage.getItem(KEYS.state);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.foundWords))
        setFoundWords(new Set(saved.foundWords));
      if (Array.isArray(saved.foundCells))
        setFoundCells(new Set(saved.foundCells));
      if (typeof saved.score === "number") setScore(saved.score);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverLockChecked, alreadySubmitted, KEYS.state]);

  /* ---------- PERSIST PROGRESS ---------- */
  useEffect(() => {
    if (!serverLockChecked || alreadySubmitted) return;
    const payload = {
      foundWords: Array.from(foundWords),
      foundCells: Array.from(foundCells),
      score,
    };
    localStorage.setItem(KEYS.state, JSON.stringify(payload));
  }, [
    foundWords,
    foundCells,
    score,
    alreadySubmitted,
    serverLockChecked,
    KEYS.state,
  ]);

  /* ---------- Native touchmove with intent detection ---------- */
  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;

    const onNativeTouchMove = (ev) => {
      const t = ev.touches?.[0];
      if (!t || !selectStart) return;

      // Decide if user intends to select (not vertical scroll)
      if (!isDragging && touchStartXY) {
        const dx = t.clientX - touchStartXY.x;
        const dy = t.clientY - touchStartXY.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        const movedEnough = absDx > DRAG_THRESHOLD || absDy > DRAG_THRESHOLD;
        const mostlyVertical = absDy > absDx * 1.2;

        if (movedEnough && !mostlyVertical) {
          setIsDragging(true);
        } else {
          // Allow page scroll while user is swiping vertically
          return;
        }
      }

      if (isDragging && ev.cancelable) ev.preventDefault(); // stop scroll only during selection

      // hit-test to update preview while dragging
      const cell = getCellFromPoint(t.clientX, t.clientY);
      if (cell) setSelectEnd(cell);
    };

    node.addEventListener("touchmove", onNativeTouchMove, { passive: false });
    return () => node.removeEventListener("touchmove", onNativeTouchMove);
  }, [isDragging, selectStart, touchStartXY]);

  /* ---------- Selection helpers ---------- */
  const alignedPath = (sr, sc, er, ec) => {
    const dr = er - sr;
    const dc = ec - sc;
    if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null; // only straight/diag
    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
    const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
    const path = [];
    for (let i = 0; i < length; i++)
      path.push([sr + stepR * i, sc + stepC * i]);
    return path;
  };

  const previewKeys = useMemo(() => {
    if (!isDragging || !selectStart || !selectEnd) return new Set();
    const [sr, sc] = selectStart;
    const [er, ec] = selectEnd;
    const path = alignedPath(sr, sc, er, ec);
    if (!path) return new Set();
    return new Set(path.map(([r, c]) => toKey(r, c)));
  }, [isDragging, selectStart, selectEnd]);

  /* ---------- Score upsert (per find) ---------- */
  const upsertScore = async (points) => {
    try {
      const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
      const uuid = user?.uuid || user?.uniqueNo;
      if (!uuid) return;
      await axios.post(`${baseUrl}/api/asian-paint/score`, {
        uuid,
        game: "wordSearch",
        day: dayKey,
        points, // server sets score.wordSearch.dayX = points
      });
    } catch (e) {
      if (e?.response?.status === 409) {
        localStorage.setItem(KEYS.done, "true");
        setAlreadySubmitted(true);
      }
    }
  };

  /* ---------- Desktop pointer (ignored during touch) ---------- */
  const onPointerDown = (r, c) => {
    if (usingTouchRef.current) return;
    if (!serverLockChecked || alreadySubmitted || finished) return;
    setIsDragging(true);
    setSelectStart([r, c]);
    setSelectEnd([r, c]);
  };
  const onPointerEnter = (r, c) => {
    if (usingTouchRef.current) return;
    if (!isDragging) return;
    setSelectEnd([r, c]);
  };
  const onPointerUp = (r, c) => {
    if (usingTouchRef.current) return;
    if (!serverLockChecked || alreadySubmitted || finished) {
      setIsDragging(false);
      setSelectStart(null);
      setSelectEnd(null);
      return;
    }
    finalizeSelection(r, c);
  };

  /* ---------- Mobile touch (with intent) ---------- */
  const onTouchStartCell = (r, c, e) => {
    if (!serverLockChecked || alreadySubmitted || finished) return;
    usingTouchRef.current = true;
    const t = e?.touches?.[0];
    if (t) setTouchStartXY({ x: t.clientX, y: t.clientY });
    // Do NOT set isDragging yet; wait for intent in touchmove
    setSelectStart([r, c]);
    setSelectEnd([r, c]);
  };

  const onTouchEndGrid = () => {
    if (!selectStart) {
      setIsDragging(false);
      setSelectStart(null);
      setSelectEnd(null);
      setTimeout(() => (usingTouchRef.current = false), 80);
      setTouchStartXY(null);
      return;
    }

    if (isDragging && selectEnd) finalizeSelection(selectEnd[0], selectEnd[1]);
    setIsDragging(false);
    setSelectStart(null);
    setSelectEnd(null);
    setTouchStartXY(null);
    setTimeout(() => (usingTouchRef.current = false), 80);
  };

  /* ---------- Tap-tap fallback ---------- */
  const onCellClick = (r, c) => {
    if (usingTouchRef.current) return;
    if (!serverLockChecked || alreadySubmitted || finished) return;
    if (!selectStart) {
      setSelectStart([r, c]);
      setSelectEnd([r, c]);
      return;
    }
    finalizeSelection(r, c);
  };

  /* ---------- Finalize a selection ---------- */
  const finalizeSelection = (r, c) => {
    if (!selectStart) return;
    const [sr, sc] = selectStart;
    const path = alignedPath(sr, sc, r, c);
    setSelectStart(null);
    setSelectEnd(null);
    setIsDragging(false);
    if (!path) return; // ignore invalid shapes

    const letters = path.map(([pr, pc]) => grid[pr][pc]).join("");
    const reversed = letters.split("").reverse().join("");
    const match = WORDS.find(
      (w) => w.length === path.length && (w === letters || w === reversed)
    );
    if (!match || foundWords.has(match)) return; // ignore non-matches/repeats

    // Mark as found
    const newFound = new Set(foundWords);
    newFound.add(match);
    setFoundWords(newFound);

    const newCells = new Set(foundCells);
    path.forEach(([pr, pc]) => newCells.add(toKey(pr, pc)));
    setFoundCells(newCells);

    // +10 and update DB with the NEW total
    setScore((prev) => {
      const next = prev + POINTS_PER_WORD;
      upsertScore(next);
      return next;
    });

    setSnack({ open: true, message: `Found ${match}! +${POINTS_PER_WORD}` });
  };

  /* ---------- Final submit on completion (kept) ---------- */
  const submitScore = async (points) => {
    try {
      const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
      const uuid = user?.uuid || user?.uniqueNo;
      if (!uuid) return;
      await axios.post(`${baseUrl}/api/asian-paint/score`, {
        uuid,
        game: "wordSearch",
        day: dayKey,
        points,
      });
      setSnack({ open: true, message: "Score submitted!" });
    } catch (e) {
      if (e?.response?.status === 409) {
        setSnack({ open: true, message: "Already submitted" });
        localStorage.setItem(KEYS.done, "true");
        setAlreadySubmitted(true);
      } else {
        setSnack({ open: true, message: "Saved locally (offline)" });
      }
    }
  };

  useEffect(() => {
    if (!serverLockChecked || alreadySubmitted) return;
    if (finished) {
      localStorage.setItem(KEYS.done, "true");
      localStorage.removeItem(KEYS.state);
      submitScore(score); // ensure final persisted value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, serverLockChecked, alreadySubmitted]);

  // Loader while checking server
  if (!serverLockChecked) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography>Checking attempt status...</Typography>
      </Box>
    );
  }

  const progressPct = (foundWords.size / WORDS.length) * 100;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: { xs: 2, md: 4 },
        mt: "50px",
        overflowX: "hidden", // prevent sneaky horizontal overflow on tiny phones
      }}
    >
      <Grid
        container
        justifyContent="center"
        sx={{ mt: { xs: 1, md: 2 }, px: "12px" }}
      >
        <Grid item xs={12} md={10} lg={8}>
          <Stack spacing={2} alignItems="stretch">
            <Typography
              sx={{
                fontSize: { xs: "16px", md: "18px" },
                fontWeight: { xs: 600, md: 800 },
              }}
              align="center"
              color="primary"
            >
              {dayKey.toUpperCase()} - Word Search
            </Typography>

            <Paper elevation={3} sx={{ p: { xs: 1.5, md: 2 } }}>
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
                      / {WORDS.length * POINTS_PER_WORD}
                    </Typography>
                  }
                  variant="outlined"
                />
                <Typography fontWeight={700}>
                  {POINTS_PER_WORD} points per word â€¢ {foundWords.size} /{" "}
                  {WORDS.length} found
                </Typography>
                <Chip
                  color={finished || alreadySubmitted ? "success" : "default"}
                  variant="filled"
                  label={
                    alreadySubmitted
                      ? "Already submitted"
                      : finished
                      ? "Completed"
                      : "In progress"
                  }
                />
              </Stack>

              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={progressPct}
                  sx={{ height: 8, borderRadius: 999 }}
                />
              </Box>
            </Paper>

            <Card elevation={6}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Found words
                </Typography>
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={1}
                  sx={{ justifyContent: { xs: "center", sm: "flex-start" } }}
                >
                  {["TEXTURES", "BRUSHES", "LONDON", "BIGBEN"].map((w) => (
                    <Chip
                      key={w}
                      label={w}
                      icon={
                        foundWords.has(w) ? <CheckCircleIcon /> : <CancelIcon />
                      }
                      color={foundWords.has(w) ? "success" : "default"}
                      variant={foundWords.has(w) ? "filled" : "outlined"}
                      sx={{ fontSize: { xs: 12, md: 14 } }}
                    />
                  ))}
                </Stack>
              </CardContent>

              <CardContent>
                {/* Wrap provides horizontal scroll if viewport < 370px */}
                <Box
                  ref={wrapRef}
                  sx={{
                    width: "100%",
                    maxWidth: "100vw", // don't allow container to exceed viewport
                    overflowX: "auto",
                    display: "flex",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Grid: enable touch selection + live preview */}
                  <Box
                    ref={gridRef}
                    onTouchEnd={onTouchEndGrid}
                    sx={{
                      width: `${gridWidth}px`,
                      display: "grid",
                      gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellPx}px)`,
                      gap: `${GRID_GAP}px`,
                      justifyContent: "center",
                      userSelect: "none",
                      touchAction: "auto", // allow normal vertical scroll; we preventDefault only while selecting
                      overscrollBehavior: "contain",
                      px: 0.5,
                      py: 0.5,
                    }}
                  >
                    {grid.map((row, r) =>
                      row.map((ch, c) => {
                        const key = toKey(r, c);
                        const isFound = foundCells.has(key);
                        const isPreview = previewKeys.has(key) && !isFound;
                        return (
                          <Button
                            key={key}
                            data-r={r}
                            data-c={c}
                            // Desktop pointer
                            onPointerDown={() => onPointerDown(r, c)}
                            onPointerEnter={() => onPointerEnter(r, c)}
                            onPointerUp={() => onPointerUp(r, c)}
                            // Mobile touch (intent captured in touchmove)
                            onTouchStart={(e) => onTouchStartCell(r, c, e)}
                            // Tap-tap fallback
                            onClick={() => onCellClick(r, c)}
                            variant={
                              isFound
                                ? "contained"
                                : isPreview
                                ? "contained"
                                : "outlined"
                            }
                            color={
                              isFound
                                ? "success"
                                : isPreview
                                ? "primary"
                                : "inherit"
                            }
                            disableRipple
                            sx={{
                              width: `${cellPx}px`,
                              height: `${cellPx}px`,
                              minWidth: `${cellPx}px`,
                              p: 0,
                              m: 0,
                              cursor: "pointer",
                              fontWeight: 800,
                              lineHeight: 1,
                              fontSize: { xs: 14, sm: 16 },
                              textTransform: "none",
                            }}
                          >
                            {ch}
                          </Button>
                        );
                      })
                    )}
                  </Box>
                </Box>

                {finished && (
                  <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                    <Button variant="contained" onClick={() => navigate("/")}>
                      Home
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={1400}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert variant="filled" severity="success" sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


