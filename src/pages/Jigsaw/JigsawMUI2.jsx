// src/pages/Jigsaw/JigsawMUI.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  Alert,
  Snackbar,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import ReplayIcon from "@mui/icons-material/Replay";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { baseUrl } from "../../components/constant/constant";
import { useNavigate, useSearchParams } from "react-router-dom";
import useGameSettings from "../../hooks/useGameSettings";

/* -------------------------------------------------------
   REPLACE THESE 3 IMAGES WITH YOUR OWN (one per day)
   ------------------------------------------------------- */
import jigsawDay1 from "../../assets/jigsaw/1.png";
import jigsawDay2 from "../../assets/jigsaw/2.png";
import jigsawDay3 from "../../assets/jigsaw/3.png";

/* ==============================
   DAY CONFIG (edit only this)
   ============================== */
const DAY_CFG = {
  day1: { image: jigsawDay1, pointsPerTile: 6.25, timerSeconds: 180 },
  day2: { image: jigsawDay2, pointsPerTile: 6.25, timerSeconds: 180 },
  day3: { image: jigsawDay3, pointsPerTile: 6.25, timerSeconds: 180 },
};

/* ==============================
   CONSTANTS (mobile-first)
   ============================== */
const ROWS = 4;
const COLS = 4;

const MIN_REF_WIDTH = 360; // no horizontal clip on phones
const MAX_REF_WIDTH = 760;
const CELL_MIN = 75; // fixed 75 looks good on 360px
const CELL_MAX = 75;
const GRID_GAP = 6;

// use shared baseUrl

/* ==============================
   Helpers
   ============================== */
const range = (n) => Array.from({ length: n }, (_, i) => i);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
// Ensure no tile starts in the correct position
const derange = (n) => {
  const base = Array.from({ length: n }, (_, i) => i);
  for (let attempt = 0; attempt < 50; attempt++) {
    const p = shuffle(base);
    if (p.every((v, i) => v === i)) continue;
    if (!p.some((v, i) => v === i)) return p;
  }
  return base.map((_, i) => (i + 1) % n);
};

// small seeded RNG so edges are stable per day
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build decorative edge map for each piece:
 * t,r,b,l ∈ {-1,0,1}  (0=flat at border, 1=tab-ish, -1=indent-ish)
 * Visually stays inside the tile bounds (no overflow).
 */
function buildEdgeMap(rows, cols, seedKey) {
  const seed = xmur3(seedKey)();
  const rnd = mulberry32(seed);
  const map = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ t: 0, r: 0, b: 0, l: 0 }))
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = map[r][c];
      cell.t = r === 0 ? 0 : -map[r - 1][c].b;
      cell.l = c === 0 ? 0 : -map[r][c - 1].r;
      cell.r = c === cols - 1 ? 0 : rnd() < 0.5 ? 1 : -1;
      cell.b = r === rows - 1 ? 0 : rnd() < 0.5 ? 1 : -1;
    }
  }
  return map;
}

/**
 * Jigsaw-ish piece path in a 100x100 viewBox.
 * Tabs/indents are drawn as bezier bumps along edges but kept inside the 100x100 box.
 */
function piecePath({ t, r, b, l }) {
  const S = 100;
  const mid1 = 34;
  const mid2 = 66;
  const bump = 12; // amplitude of bump (inside the square)
  const small = 6; // control point offset

  const topBump = t === 0 ? 0 : t > 0 ? -bump : bump;
  const rightBump = r === 0 ? 0 : r > 0 ? -bump : bump;
  const bottomBump = b === 0 ? 0 : b > 0 ? -bump : bump;
  const leftBump = l === 0 ? 0 : l > 0 ? -bump : bump;

  const p = [];
  // start top-left
  p.push(`M 0 0`);
  // TOP edge (0,0) -> (100,0)
  if (topBump === 0) {
    p.push(`L ${S} 0`);
  } else {
    p.push(`L ${mid1} 0`);
    p.push(
      `C ${mid1 + small} ${0 + topBump}, ${mid2 - small} ${
        0 + topBump
      }, ${mid2} 0`
    );
    p.push(`L ${S} 0`);
  }
  // RIGHT edge (100,0) -> (100,100)
  if (rightBump === 0) {
    p.push(`L ${S} ${S}`);
  } else {
    p.push(`L ${S} ${mid1}`);
    p.push(
      `C ${S + rightBump} ${mid1 + small}, ${S + rightBump} ${
        mid2 - small
      }, ${S} ${mid2}`
    );
    p.push(`L ${S} ${S}`);
  }
  // BOTTOM edge (100,100) -> (0,100)
  if (bottomBump === 0) {
    p.push(`L 0 ${S}`);
  } else {
    p.push(`L ${mid2} ${S}`);
    p.push(
      `C ${mid2 - small} ${S + bottomBump}, ${mid1 + small} ${
        S + bottomBump
      }, ${mid1} ${S}`
    );
    p.push(`L 0 ${S}`);
  }
  // LEFT edge (0,100) -> (0,0)
  if (leftBump === 0) {
    p.push(`Z`);
  } else {
    p.push(`L 0 ${mid2}`);
    p.push(
      `C ${0 + leftBump} ${mid2 - small}, ${0 + leftBump} ${
        mid1 + small
      }, 0 ${mid1}`
    );
    p.push(`Z`);
  }
  return p.join(" ");
}

// Compute background offset for the image inside each piece (SVG coords)
const svgImageOffset = (row, col) => ({
  x: -col * 100,
  y: -row * 100,
});

export default function JigsawMUI2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Day from settings
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
    const v = (queryDay || String(rawDay).toLowerCase());
    return ["day1", "day2", "day3"].includes(v) ? v : "day1";
  }, [queryDay, rawDay]);
  const slot = useMemo(() => {
    const s = parseInt(searchParams.get("slot"), 10);
    if (Number.isFinite(s) && s > 0) return s;
    return Number(gs.currentSlot) || 1;
  }, [searchParams, gs.currentSlot]);

  // Per-day config + server overrides
  const cfg = DAY_CFG[dayKey] || DAY_CFG.day1;
  const [serverCfg, setServerCfg] = useState({ imageUrl: null, pointsPerTile: null, timerSeconds: null });
  const [contentLoading, setContentLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("ap_user") || "null");
        const uuid = user?.uuid || user?.uniqueNo;
        const { data } = await axios.get(`${baseUrl}/api/asian-paint/content`, {
          params: { day: dayKey, game: 'jigsaw', uuid, slot },
        });
        const p = data?.payload || {};
        setServerCfg({
          imageUrl: p.imageUrl || null,
          pointsPerTile: Number(p.pointsPerTile) || null,
          timerSeconds: Number(p.timerSeconds || p.timeLimit) || null,
        });
      } catch {} finally { setContentLoading(false); }
    })();
  }, [dayKey, slot]);
  const puzzleImg = serverCfg.imageUrl || cfg.image;
  const POINTS_PER_TILE = serverCfg.pointsPerTile || cfg.pointsPerTile;
  const TIMER_SECONDS = serverCfg.timerSeconds || cfg.timerSeconds;

  // Keys (includes final score to lock on reload)
  const KEYS = useMemo(
    () => ({
      user: "ap_user",
      state: `ap_jigsaw_state_${dayKey}_s${slot}_v4`,
      timer: `ap_jigsaw_timer_${dayKey}_s${slot}_v4`,
      done: `ap_jigsaw_completed_${dayKey}_s${slot}_v4`,
      final: `ap_jigsaw_final_${dayKey}_s${slot}_v4`,
    }),
    [dayKey, slot]
  );

  /* ---------- Sizing (no half tiles) ---------- */
  const wrapRef = useRef(null);
  const [cellPx, setCellPx] = useState(CELL_MIN);
  const [gridWidth, setGridWidth] = useState(MIN_REF_WIDTH);
  const [gridHeight, setGridHeight] = useState(MIN_REF_WIDTH);

  const computeFromWidth = (availWidth) => {
    const avail = Math.max(MIN_REF_WIDTH, Math.min(availWidth, MAX_REF_WIDTH));
    const totalGaps = GRID_GAP * (COLS - 1);
    const rawCell = Math.floor((avail - totalGaps) / COLS);
    const nextCell = Math.max(CELL_MIN, Math.min(CELL_MAX, rawCell));
    const nextGridW = nextCell * COLS + totalGaps;

    setCellPx(nextCell);
    setGridWidth(nextGridW);
    setGridHeight(nextCell * ROWS + GRID_GAP * (ROWS - 1));
  };

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) computeFromWidth(w);
      }
    });
    const initialWidth = node.getBoundingClientRect().width;
    if (initialWidth > 0) computeFromWidth(initialWidth);
    ro.observe(node);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Piece edges (stable per day) ---------- */
  const edgesMap = useMemo(
    () => buildEdgeMap(ROWS, COLS, `${dayKey}-edges`),
    [dayKey]
  );

  /* ---------- Game State ---------- */
  const totalTiles = ROWS * COLS;
  const solvedOrder = useMemo(() => range(totalTiles), [totalTiles]);

  const [order, setOrder] = useState(() => derange(totalTiles));
  const [credited, setCredited] = useState(() => new Set());
  const [score, setScore] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const [serverLockChecked, setServerLockChecked] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [timeUp, setTimeUp] = useState(false);

  const [snack, setSnack] = useState({ open: false, message: "" });
  const [refOpen, setRefOpen] = useState(false);
  const submittedRef = useRef(false);

  const finished = useMemo(
    () => order.every((tileId, pos) => tileId === pos),
    [order]
  );

  const SAFE_TIMER = Number(TIMER_SECONDS) > 0 ? Number(TIMER_SECONDS) : 1;
  const timePct = Math.max(0, Math.min(100, (secondsLeft / SAFE_TIMER) * 100));
  const timeColor = secondsLeft <= 10 ? 'error' : secondsLeft <= 20 ? 'warning' : 'primary';
  const progressPct = (credited.size / totalTiles) * 100;

  // Reset lock flags when day/slot changes so we re-check correctly
  useEffect(() => {
    setServerLockChecked(false);
    setAlreadySubmitted(false);
    setTimeUp(false);
    submittedRef.current = false;
  }, [dayKey, slot]);

  /* ---------- Server lock + resume (trust local done first) ---------- */
  useEffect(() => {
    (async () => {
      // local done → lock immediately
      if (localStorage.getItem(KEYS.done) === "true") {
        const savedFinal = parseInt(localStorage.getItem(KEYS.final) || "", 10);
        const finalScore = Number.isFinite(savedFinal)
          ? savedFinal
          : ROWS * COLS * POINTS_PER_TILE;

        setAlreadySubmitted(true);
        setOrder(solvedOrder);
        setCredited(new Set(solvedOrder));
        setScore(finalScore);
        setSecondsLeft(0);
        setTimeUp(true);
        setServerLockChecked(true);
        return;
      }

      try {
        const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
        const uuid = user?.uuid || user?.uniqueNo;
        if (!uuid) {
          setServerLockChecked(true);
          return;
        }

        const { data } = await axios.get(
          `${baseUrl}/api/asian-paint/score/status`,
          { params: { uuid, game: "jigsaw", day: dayKey, slot } }
        );

        if (data?.submitted) {
          localStorage.setItem(KEYS.done, "true");
          if (typeof data.points === "number") {
            localStorage.setItem(KEYS.final, String(data.points));
          }
          setAlreadySubmitted(true);
          setOrder(solvedOrder);
          setCredited(new Set(solvedOrder));
          setScore(
            typeof data.points === "number"
              ? data.points
              : ROWS * COLS * POINTS_PER_TILE
          );
          setSecondsLeft(0);
          setTimeUp(true);
        } else {
          // resume local progress (not submitted anywhere)
          try {
            const raw = localStorage.getItem(KEYS.state);
            if (raw) {
              const saved = JSON.parse(raw);
              if (
                Array.isArray(saved.order) &&
                saved.order.length === totalTiles
              )
                setOrder(saved.order);
              if (Array.isArray(saved.credited))
                setCredited(new Set(saved.credited));
              if (typeof saved.score === "number") setScore(saved.score);
            }
            const tRaw = localStorage.getItem(KEYS.timer);
            if (tRaw) {
              const t = parseInt(tRaw, 10);
              if (!Number.isNaN(t))
                setSecondsLeft(Math.max(0, Math.min(TIMER_SECONDS, t)));
            }
          } catch {}
        }
      } catch {
        // offline: ignore
      } finally {
        setServerLockChecked(true);
      }
    })();
  }, [dayKey, slot, KEYS.done, KEYS.final, KEYS.state, KEYS.timer]);

  // Persist local progress
  useEffect(() => {
    if (!serverLockChecked || alreadySubmitted || timeUp || finished) return;
    localStorage.setItem(
      KEYS.state,
      JSON.stringify({ order, credited: Array.from(credited), score })
    );
  }, [
    order,
    credited,
    score,
    alreadySubmitted,
    serverLockChecked,
    finished,
    timeUp,
    KEYS.state,
  ]);

  // Persist timer
  useEffect(() => {
    if (!serverLockChecked || alreadySubmitted || timeUp || finished) return;
    localStorage.setItem(KEYS.timer, String(secondsLeft));
  }, [
    secondsLeft,
    alreadySubmitted,
    serverLockChecked,
    finished,
    timeUp,
    KEYS.timer,
  ]);

  /* ---------- Timer ---------- */
  useEffect(() => {
    if (!serverLockChecked) return;
    if (alreadySubmitted || finished || timeUp) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setTimeUp(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [serverLockChecked, alreadySubmitted, finished, timeUp]);

  /* ---------- Scoring API ---------- */
  const upsertScore = async (points) => {
    try {
      const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
      const uuid = user?.uuid || user?.uniqueNo;
      if (!uuid) return;
      await axios.post(`${baseUrl}/api/asian-paint/score`, {
        uuid,
        game: "jigsaw",
        day: dayKey,
        slot,
        points,
      });
    } catch (e) {
      if (e?.response?.status === 409) {
        localStorage.setItem(KEYS.done, "true");
        setAlreadySubmitted(true);
      }
    }
  };

  const submitScore = async (points) => {
    try {
      const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
      const uuid = user?.uuid || user?.uniqueNo;
      if (!uuid) return;
      await axios.post(`${baseUrl}/api/asian-paint/score`, {
        uuid,
        game: "jigsaw",
        day: dayKey,
        slot,
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

  // Lock and persist final on finish/timeUp
  useEffect(() => {
    if (!serverLockChecked || alreadySubmitted || submittedRef.current) return;
    if (finished || timeUp) {
      localStorage.setItem(KEYS.done, "true");
      localStorage.setItem(KEYS.final, String(score));
      localStorage.removeItem(KEYS.state);
      localStorage.removeItem(KEYS.timer);
      submittedRef.current = true;
      setAlreadySubmitted(true);
      submitScore(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, timeUp, serverLockChecked, alreadySubmitted]);

  /* ---------- Game logic ---------- */
  const swap = (i, j) => {
    if (finished || timeUp || alreadySubmitted) return;
    if (order[i] === i || order[j] === j || credited.has(i) || credited.has(j)) return;
    setOrder((prev) => {
      if (prev[i] === i || prev[j] === j || credited.has(i) || credited.has(j)) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];

      const justCorrect = [];
      [i, j].forEach((pos) => {
        if (next[pos] === pos && !credited.has(pos)) justCorrect.push(pos);
      });

      if (justCorrect.length) {
        setCredited((old) => {
          const merged = new Set(old);
          justCorrect.forEach((p) => merged.add(p));
          return merged;
        });
        setScore((prevScore) => {
          const nextScore = prevScore + justCorrect.length * POINTS_PER_TILE;
          upsertScore(nextScore); // auto-save to backend
          return nextScore;
        });
        setSnack({
          open: true,
          message: `Nice! +${justCorrect.length * POINTS_PER_TILE}`,
        });
      }
      return next;
    });
  };

  const handleTileTap = (boardIndex) => {
    if (!serverLockChecked || alreadySubmitted || timeUp || finished) return;
    if (order[boardIndex] === boardIndex || credited.has(boardIndex)) return;
    if (selectedIndex === null) {
      setSelectedIndex(boardIndex);
    } else if (selectedIndex === boardIndex) {
      setSelectedIndex(null);
    } else {
      if (order[selectedIndex] === selectedIndex || order[boardIndex] === boardIndex) {
        setSelectedIndex(null);
        return;
      }
      swap(selectedIndex, boardIndex);
      setSelectedIndex(null);
    }
  };

  const reshuffle = () => {
    if (alreadySubmitted || timeUp || finished) return;
    const shuf = derange(totalTiles);
    setOrder(shuf);
    setSelectedIndex(null);
    setCredited(new Set());
    setScore(0);
  };

  /* ---------- Loading ---------- */
  if (!serverLockChecked) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography>Checking attempt status...</Typography>
      </Box>
    );
  }
  if (contentLoading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography>Loading puzzle...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        WebkitTextSizeAdjust: "100%",
        bgcolor: "rgb(11,16,34)",
        backgroundImage:
          "radial-gradient(60rem 60rem at -20% -10%, rgba(33,150,243,0.08), transparent), radial-gradient(40rem 40rem at 120% 110%, rgba(76,175,80,0.08), transparent)",
        py: { xs: 2, md: 4 },
        overflowX: "hidden",
      }}
    >
      {/* Home (top-right) */}
      <IconButton
        aria-label="Home"
        onClick={() => navigate("/")}
        sx={{
          position: "fixed",
          top: 55,
          right: 12,
          zIndex: 10,
          color: "white",
        }}
      >
        <HomeIcon />
      </IconButton>

      <Grid container justifyContent="center" sx={{ px: "12px", mt: "40px" }}>
        <Grid item xs={12} md={10} lg={8}>
          <Stack spacing={2}>
            <Typography
              sx={{
                fontSize: { xs: "16px", md: "18px" },
                fontWeight: { xs: 700, md: 800 },
                display: "none",
              }}
              align="center"
              color="primary.light"
            >
              {dayKey.toUpperCase()} – Jigsaw Puzzle
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "16px", md: "18px" },
                fontWeight: { xs: 700, md: 800 },
              }}
              align="center"
              color="primary.light"
            >
              {`${dayKey.toUpperCase()} - Jigsaw Puzzle`}
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, md: 2 },
                bgcolor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
                borderRadius: 2,
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <Chip
                  label={
                    <Typography fontWeight={800}>
                      Score:{" "}
                      <Typography
                        component="span"
                        color="primary.light"
                        fontWeight={900}
                      >
                        {score}
                      </Typography>{" "}
                      / {ROWS * COLS * POINTS_PER_TILE}
                    </Typography>
                  }
                  variant="outlined"
                  sx={{ bgcolor: "rgba(255,255,255,0.04)" }}
                />
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ flexWrap: "wrap" }}
                >
                  <Chip
                    icon={<AccessTimeIcon />}
                    label={`${secondsLeft}s`}
                    color={
                      secondsLeft <= 10
                        ? "error"
                        : secondsLeft <= 20
                        ? "warning"
                        : "default"
                    }
                  />
                  <Typography
                    sx={{
                      fontSize: { xs: "14px", md: "18px" },
                      fontWeight: { xs: 600, md: 800 },
                    }}
                    color="rgba(255,255,255,0.9)"
                  >
                    Tap two tiles to swap • {credited.size} / {ROWS * COLS}{" "}
                    placed
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => setRefOpen(true)}
                  >
                    Reference
                  </Button>
                  <Chip
                    color={
                      finished || alreadySubmitted || timeUp
                        ? "success"
                        : "default"
                    }
                    variant="filled"
                    label={
                      alreadySubmitted
                        ? "Already submitted"
                        : finished
                        ? "Completed"
                        : timeUp
                        ? "Time's up"
                        : "In progress"
                    }
                  />
                  {!alreadySubmitted && !timeUp && !finished && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ReplayIcon />}
                      onClick={reshuffle}
                    >
                      Shuffle
                    </Button>
                  )}
                </Stack>
              </Stack>

              {/* Time & placement bars */}
              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    position: 'relative',
                    height: 8,
                    borderRadius: 999,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      right: 0,
                      width: '100%',
                      transformOrigin: 'right',
                      transform: `scaleX(${Math.max(0, Math.min(1, timePct / 100))})`,
                      backgroundColor: (theme) =>
                        (theme.palette?.[timeColor]?.main || theme.palette.primary.main),
                      transition: 'transform 0.3s linear',
                    }}
                  />
                </Box>
              </Box>
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={progressPct}
                  sx={{ height: 6, borderRadius: 999 }}
                />
              </Box>
            </Paper>

            {/* Puzzle grid */}
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.12)",
                bgcolor: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(6px)",
              }}
            >
              <CardHeader
                title={
                  <Typography
                    sx={{
                      fontSize: { xs: "1rem", md: "1.2rem" },
                      fontWeight: 800,
                    }}
                  >
                    Jigsaw
                  </Typography>
                }
              />
              <CardContent sx={{ p: { xs: 1, md: 2 }, overflowX: "hidden" }}>
                <Box
                  ref={wrapRef}
                  sx={{
                    width: "100%",
                    maxWidth: "100%",
                    mx: "auto",
                    overflow: "hidden",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: `${gridWidth}px`,
                      height: `${gridHeight}px`,
                      display: "grid",
                      gridTemplateColumns: `repeat(${COLS}, ${cellPx}px)`,
                      gridTemplateRows: `repeat(${ROWS}, ${cellPx}px)`,
                      gap: `${GRID_GAP}px`,
                      justifyContent: "center",
                      userSelect: "none",
                      touchAction: "manipulation",
                      borderRadius: 2,
                      overflow: "hidden",
                      mx: "auto",
                    }}
                  >
                    {order.map((tileId, pos) => {
                      // Source coordinates of the piece in the ORIGINAL image
                      const srcRow = Math.floor(tileId / COLS);
                      const srcCol = tileId % COLS;

                      const correct = tileId === pos || credited.has(pos);
                      const selected =
                        selectedIndex === pos &&
                        !alreadySubmitted &&
                        !timeUp &&
                        !finished;

                      // Use edges & image offset from the SOURCE piece, not the board cell
                      const e = edgesMap[srcRow][srcCol];
                      const d = piecePath(e);
                      const { x, y } = svgImageOffset(srcRow, srcCol);

                      const strokeColor = selected
                        ? "rgba(25,118,210,0.95)"
                        : correct
                        ? "rgba(56,142,60,0.95)"
                        : "rgba(255,255,255,0.7)";

                      return (
                        <Box
                          key={pos}
                          role="button"
                          aria-label={`Tile ${pos}`}
                          onClick={() => handleTileTap(pos)}
                          sx={{
                            width: `${cellPx}px`,
                            height: `${cellPx}px`,
                            cursor:
                              alreadySubmitted || timeUp || finished || correct
                                ? "default"
                                : "pointer",
                          }}
                        >
                          <svg
                            width={cellPx}
                            height={cellPx}
                            viewBox="0 0 100 100"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            <defs>
                              <clipPath id={`clip-${pos}`}>
                                <path d={d} />
                              </clipPath>
                            </defs>
                            <image
                              href={puzzleImg}
                              x={x}
                              y={y}
                              width={COLS * 100}
                              height={ROWS * 100}
                              clipPath={`url(#clip-${pos})`}
                              preserveAspectRatio="none"
                            />
                            {correct ? (
                              <path d={d} fill="rgba(56,142,60,0.18)" />
                            ) : null}
                            <path
                              d={d}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth={1.6}
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                {(finished || timeUp) && (
                  <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<DoneAllIcon />}
                      onClick={() => navigate("/")}
                    >
                      Home
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Reference Image Dialog */}
      <Dialog
        open={refOpen}
        onClose={() => setRefOpen(false)}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
        BackdropProps={{ sx: { backgroundColor: "rgba(0,0,0,0.6)" } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
          }}
        >
          Reference
          <IconButton
            aria-label="Close reference"
            onClick={() => setRefOpen(false)}
            edge="end"
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            p: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            "& img": {
              width: "100%",
              height: "auto",
              maxHeight: { xs: "100vh", sm: "80vh" },
              objectFit: "contain",
              display: "block",
            },
          }}
        >
          <img src={puzzleImg} alt="Reference" />
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={1300}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert variant="filled" severity="success" sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
