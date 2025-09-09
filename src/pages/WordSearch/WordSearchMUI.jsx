// src/pages/WordSearch/WordSearchMUI.jsx
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
const GRID_SIZE = 9; // 9x9 grid
const GRID_GAP = 4;

// Mobile sizing (hard min 360px)
const MIN_REF_WIDTH = 360;
const MAX_REF_WIDTH = 760;
const CELL_MIN = 26;
const CELL_MAX = 48;

// baseUrl from constant.js

// Words (fit 9x9)
const WORDS = ["TEXTURES", "BRUSHES", "LONDON", "BIGBEN"];

/* ==============================
   Utils
   ============================== */
const toKey = (r, c) => `${r},${c}`;

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
   Fixed placements (no conflicts)
   ============================== */
const DEFAULT_PLACEMENTS = [
  { word: "TEXTURES", start: [0, 0], dir: [1, 1] }, // â†˜
  { word: "BRUSHES", start: [0, 8], dir: [1, 0] }, // â†“
  { word: "LONDON", start: [8, 0], dir: [0, 1] }, // â†’
  { word: "BIGBEN", start: [6, 0], dir: [0, 1] }, // â†’
];

function buildGrid(seedString = "default", placementsList = DEFAULT_PLACEMENTS) {
  const grid = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => "")
  );

  placementsList.forEach(({ word, start, dir }) => {
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

  // Fill with deterministic A-Z
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
export default function WordSearchMUI() {
  const navigate = useNavigate();

  // Active day (from settings)
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

  // LocalStorage keys (per day)
  const KEYS = useMemo(
    () => ({
      user: "ap_user",
      state: `ap_ws_state_${dayKey}_v4`,
      done: `ap_ws_completed_${dayKey}_v4`,
      grid: `ap_ws_grid_${dayKey}_v4`,
    }),
    [dayKey]
  );

  // Server-driven overrides (optional)
  const [contentVersion, setContentVersion] = useState(0);
  const [pointsPerWord, setPointsPerWord] = useState(POINTS_PER_WORD);
  const [serverWords, setServerWords] = useState(null);
  const [serverPlacements, setServerPlacements] = useState(null);
  const WORDS = useMemo(
    () => serverWords || ["TEXTURES", "BRUSHES", "LONDON", "BIGBEN"],
    [serverWords]
  );
  const placementsList = useMemo(
    () => serverPlacements || DEFAULT_PLACEMENTS,
    [serverPlacements]
  );

  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
        const uuid = user?.uuid || user?.uniqueNo;
        const { data } = await axios.get(`${baseUrl}/api/asian-paint/content`, {
          params: { day: dayKey, game: "wordSearch", uuid },
        });
        setContentVersion(data?.version || 0);
        const ppw = Number(
          data?.payload?.pointsPerWord ?? data?.payload?.points_per_word
        );
        if (Number.isFinite(ppw) && ppw > 0) setPointsPerWord(ppw);
        if (Array.isArray(data?.payload?.words) && data.payload.words.length) {
          setServerWords(
            data.payload.words.map((w) => String(w).toUpperCase())
          );
        }
        if (Array.isArray(data?.payload?.placements) && data.payload.placements.length) {
          setServerPlacements(
            data.payload.placements.map((p) => ({
              word: String(p.word).toUpperCase(),
              start: p.start,
              dir: p.dir,
            }))
          );
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  /* ---------- Responsive sizing (instant, no scroll needed) ---------- */
  const wrapRef = useRef(null);
  const gridRef = useRef(null);
  const [cellPx, setCellPx] = useState(32);
  const [gridWidth, setGridWidth] = useState(MIN_REF_WIDTH);

  const computeFromWidth = (availWidth) => {
    const avail = Math.max(MIN_REF_WIDTH, Math.min(availWidth, MAX_REF_WIDTH));
    const totalGaps = GRID_GAP * (GRID_SIZE - 1);
    const rawCell = Math.floor((avail - totalGaps) / GRID_SIZE);
    const nextCell = Math.max(CELL_MIN, Math.min(CELL_MAX, rawCell));
    const nextGridW = nextCell * GRID_SIZE + totalGaps;
    setCellPx(nextCell);
    setGridWidth(nextGridW);
  };

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) computeFromWidth(w);
    });

    // initial measurement
    const w0 = node.getBoundingClientRect().width;
    if (w0 > 0) computeFromWidth(w0);

    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  /* ---------- Server lock (hard block even if LS cleared) ---------- */
  const [serverLockChecked, setServerLockChecked] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  /* ---------- Game state ---------- */
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
    const g = buildGrid(`ws-${dayKey}-9x9`, placementsList);
    localStorage.setItem(KEYS.grid, JSON.stringify(g));
    return g;
  });
  const [foundWords, setFoundWords] = useState(() => new Set());
  const [foundCells, setFoundCells] = useState(() => new Set());
  const [score, setScore] = useState(0);

  // selection + live preview
  const [isDragging, setIsDragging] = useState(false);
  const [selectStart, setSelectStart] = useState(null); // [r,c]
  const [selectEnd, setSelectEnd] = useState(null); // [r,c]
  const usingTouchRef = useRef(false);

  const [snack, setSnack] = useState({ open: false, message: "" });

  const totalPoints = WORDS.length * pointsPerWord;
  const finished = foundWords.size === WORDS.length;

  /* ---------- Helper to hit-test cell under finger ---------- */
  function getCellFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cell = el.closest ? el.closest("[data-r][data-c]") : el;
    const rAttr = cell?.getAttribute?.("data-r");
    const cAttr = cell?.getAttribute?.("data-c");
    if (rAttr == null || cAttr == null) return null;
    return [Number(rAttr), Number(cAttr)];
  }

  /* ---------- Server lock check ---------- */
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
          const pts = Number(data.points) || 0;
          setScore(pts);
          // Only show as finished if server says full points
          if (pts >= totalPoints) {
            setFoundWords(new Set(WORDS));
          } else {
            // hydrate whatever local progress we have, but keep input disabled
            try {
              const raw = localStorage.getItem(KEYS.state);
              if (raw) {
                const saved = JSON.parse(raw);
                if (Array.isArray(saved.foundWords))
                  setFoundWords(new Set(saved.foundWords));
                if (Array.isArray(saved.foundCells))
                  setFoundCells(new Set(saved.foundCells));
              }
            } catch {}
          }
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

  /* ---------- Load local progress ---------- */
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

  /* ---------- Persist progress ---------- */
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

  /* ---------- Native touchmove (passive:false to allow preventDefault) ---------- */
  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;
    const onNativeTouchMove = (ev) => {
      if (!isDragging) return;
      if (ev.cancelable) ev.preventDefault();
      const t = ev.touches?.[0];
      if (!t) return;
      const cell = getCellFromPoint(t.clientX, t.clientY);
      if (cell) setSelectEnd(cell);
    };
    node.addEventListener("touchmove", onNativeTouchMove, { passive: false });
    return () => node.removeEventListener("touchmove", onNativeTouchMove);
  }, [isDragging]);

  /* ---------- Selection helpers ---------- */
  const alignedPath = (sr, sc, er, ec) => {
    const dr = er - sr;
    const dc = ec - sc;
    if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null;
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

  // const upsertScore = async (points) => {
  //   try {
  //     const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
  //     const uuid = user?.uuid || user?.uniqueNo;
  //     if (!uuid) return;
  //     await axios.post(`${baseUrl}/api/asian-paint/score`, {
  //       uuid,
  //       game: "wordSearch",
  //       day: dayKey,
  //       points,
  //     });
  //   } catch (e) {
  //     if (e?.response?.status === 409) {
  //       localStorage.setItem(KEYS.done, "true");
  //       setAlreadySubmitted(true);
  //     }
  //   }
  // };

  /* ---------- Desktop pointer ---------- */
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

  /* ---------- Mobile touch ---------- */
  const onTouchStartCell = (r, c) => {
    if (!serverLockChecked || alreadySubmitted || finished) return;
    usingTouchRef.current = true;
    setIsDragging(true);
    setSelectStart([r, c]);
    setSelectEnd([r, c]);
  };
  const onTouchEndGrid = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (selectStart && selectEnd) {
      finalizeSelection(selectEnd[0], selectEnd[1]);
    } else {
      setSelectStart(null);
      setSelectEnd(null);
    }
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

  /* ---------- Finalize selection ---------- */
  const finalizeSelection = (r, c) => {
    if (!selectStart) return;
    const [sr, sc] = selectStart;
    const path = alignedPath(sr, sc, r, c);
    setSelectStart(null);
    setSelectEnd(null);
    setIsDragging(false);
    if (!path) return;

    const letters = path.map(([pr, pc]) => grid[pr][pc]).join("");
    const reversed = letters.split("").reverse().join("");
    const match = WORDS.find(
      (w) => w.length === path.length && (w === letters || w === reversed)
    );
    if (!match || foundWords.has(match)) return;

    const newFound = new Set(foundWords);
    newFound.add(match);
    setFoundWords(newFound);

    const newCells = new Set(foundCells);
    path.forEach(([pr, pc]) => newCells.add(toKey(pr, pc)));
    setFoundCells(newCells);
    setScore((prev) => prev + pointsPerWord);
    setSnack({ open: true, message: `Found ${match}! +${pointsPerWord}` });
  };

  /* ---------- Final submit ---------- */
  const submitScore = async (points) => {
    try {
      const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
      const uuid = user?.uuid || user?.uniqueNo;
      if (!uuid) return;
      await axios.post(`${baseUrl}/api/asian-paint/score/submit`, {
        uuid,
        day: dayKey,
        game: "wordSearch",
        contentVersion: 0,
        payload: { found: foundWords.size, wordsMax: WORDS.length, pointsPerWord: 10 },
      });
      setSnack({ open: true, message: "Score submitted!" });
    } catch (e) {
      if (e?.response?.status === 409) {
        setSnack({ open: true, message: "Already submitted" });
        localStorage.setItem(KEYS.done, "true");
        setAlreadySubmitted(true);
      } else {
        // Fallback to legacy endpoint
        try {
          const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
          const uuid = user?.uuid || user?.uniqueNo;
          await axios.post(`${baseUrl}/api/asian-paint/score`, {
            uuid,
            game: "wordSearch",
            day: dayKey,
            points,
          });
          setSnack({ open: true, message: "Score submitted!" });
        } catch {
          setSnack({ open: true, message: "Saved locally (offline)" });
        }
      }
    }
  };

  useEffect(() => {
    if (!serverLockChecked || alreadySubmitted) return;
    if (finished) {
      localStorage.setItem(KEYS.done, "true");
      localStorage.removeItem(KEYS.state);
      submitScore(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, serverLockChecked, alreadySubmitted]);

  /* ---------- UI ---------- */
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
                      / {WORDS.length * pointsPerWord}
                    </Typography>
                  }
                  variant="outlined"
                />
                <Typography fontWeight={700}>
                  {pointsPerWord} points per word - {foundWords.size} /{" "}
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
                {/* Wrapper we observe for width (no need to scroll first) */}
                <Box
                  ref={wrapRef}
                  sx={{
                    width: "100%",
                    overflowX: "auto",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {/* Grid */}
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
                      touchAction: "none",
                      overscrollBehavior: "contain",
                      px: 0.5,
                      py: 0.5,
                    }}
                  >
                    {grid.map((row, r) =>
                      row.map((ch, c) => {
                        const key = toKey(r, c);
                        const isFound = foundCells.has(key);
                        const isPreview =
                          isDragging &&
                          selectStart &&
                          selectEnd &&
                          (() => {
                            // inline quick check using alignedPath
                            const path = (() => {
                              const [sr, sc] = selectStart;
                              const [er, ec] = selectEnd;
                              const p = alignedPath(sr, sc, er, ec);
                              return p || [];
                            })();
                            return (
                              path.some(([rr, cc]) => rr === r && cc === c) &&
                              !isFound
                            );
                          })();
                        return (
                          <Button
                            key={key}
                            data-r={r}
                            data-c={c}
                            onPointerDown={() => onPointerDown(r, c)}
                            onPointerEnter={() => onPointerEnter(r, c)}
                            onPointerUp={() => onPointerUp(r, c)}
                            onTouchStart={() => onTouchStartCell(r, c)}
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





