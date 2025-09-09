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
import { useNavigate } from "react-router-dom";
import useGameSettings from "../../hooks/useGameSettings";

/* -------------------------------------------------------
   REPLACE THESE 3 IMAGES WITH YOUR OWN (one per day)
   ------------------------------------------------------- */
import jigsawDay1 from "../../assets/jigsaw/day1.jpg"; // Day 1 image
import jigsawDay2 from "../../assets/jigsaw/day2.jpg"; // Day 2 image
import jigsawDay3 from "../../assets/jigsaw/day3.jpg"; // Day 3 image

/* ==============================
   DAY CONFIG (edit only this)
   ============================== */
const DAY_CFG = {
  day1: { image: jigsawDay1, pointsPerTile: 10, timerSeconds: 120 },
  day2: { image: jigsawDay2, pointsPerTile: 15, timerSeconds: 90 },
  day3: { image: jigsawDay3, pointsPerTile: 20, timerSeconds: 60 },
};

/* ==============================
   CONSTANTS (mobile-first)
   ============================== */
const ROWS = 4;
const COLS = 4;

const MIN_REF_WIDTH = 360; // hard minimum so phones don't clip
const MAX_REF_WIDTH = 760; // keep things reasonable on desktop
const CELL_MIN = 75; // your requested min cell (fits 360px perfectly)
const CELL_MAX = 75;
const GRID_GAP = 6;

const baseUrl =
  import.meta.env.VITE_APP_ENV === "local"
    ? "http://localhost:7000"
    : "https://api.nivabupalaunchevent.com";

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

const bgPosForTile = (tileId, widthPx, heightPx) => {
  const tileW = widthPx / COLS;
  const tileH = heightPx / ROWS;
  const srcCol = tileId % COLS;
  const srcRow = Math.floor(tileId / COLS);
  const x = -srcCol * tileW;
  const y = -srcRow * tileH;
  return `${x}px ${y}px`;
};

export default function JigsawMUI() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Day from settings
  const gs = useGameSettings() || {};
  const rawDay =
    gs.activeDay ||
    gs.day ||
    gs.currentDay ||
    gs.gameDay ||
    gs.settings?.activeDay ||
    gs.settings?.day ||
    "day1";
  const dayKey = useMemo(() => {
    const v = String(rawDay).toLowerCase();
    return ["day1", "day2", "day3"].includes(v) ? v : "day1";
  }, [rawDay]);

  // Per-day config
  const cfg = DAY_CFG[dayKey] || DAY_CFG.day1;
  const puzzleImg = cfg.image;
  const POINTS_PER_TILE = cfg.pointsPerTile;
  const TIMER_SECONDS = cfg.timerSeconds;

  // Keys
  const KEYS = useMemo(
    () => ({
      user: "ap_user",
      state: `ap_jigsaw_state_${dayKey}_v4`,
      timer: `ap_jigsaw_timer_${dayKey}_v4`,
      done: `ap_jigsaw_completed_${dayKey}_v4`,
      final: `ap_jigsaw_final_${dayKey}_v4`,
    }),
    [dayKey]
  );

  /* ---------- Sizing (bulletproof, no half tiles) ---------- */
  const wrapRef = useRef(null);
  const [cellPx, setCellPx] = useState(CELL_MIN);
  const [gridWidth, setGridWidth] = useState(MIN_REF_WIDTH);
  const [gridHeight, setGridHeight] = useState(MIN_REF_WIDTH);

  const computeFromWidth = (availWidth) => {
    // clamp available width
    const avail = Math.max(MIN_REF_WIDTH, Math.min(availWidth, MAX_REF_WIDTH));
    const totalGaps = GRID_GAP * (COLS - 1);

    // choose the largest integer cell that fits exactly (no overflow)
    const rawCell = Math.floor((avail - totalGaps) / COLS);
    const nextCell = Math.max(CELL_MIN, Math.min(CELL_MAX, rawCell));
    const nextGridW = nextCell * COLS + totalGaps;

    setCellPx(nextCell);
    setGridWidth(nextGridW); // <= avail by construction
    setGridHeight(nextCell * ROWS + GRID_GAP * (ROWS - 1));
  };

  // Measure exact wrapper width using ResizeObserver (no window guesses)
  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width; // exact inner width
        if (w > 0) computeFromWidth(w);
      }
    });

    // initial measurement
    const initialWidth = node.getBoundingClientRect().width;
    if (initialWidth > 0) computeFromWidth(initialWidth);

    ro.observe(node);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Game State ---------- */
  const totalTiles = ROWS * COLS;
  const solvedOrder = useMemo(() => range(totalTiles), [totalTiles]);

  const [order, setOrder] = useState(() => {
    const s = shuffle(solvedOrder);
    if (s.every((v, i) => v === i)) s.reverse();
    return s;
  });
  const [credited, setCredited] = useState(() => new Set());
  const [score, setScore] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const [serverLockChecked, setServerLockChecked] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [timeUp, setTimeUp] = useState(false);

  const [snack, setSnack] = useState({ open: false, message: "" });
  const [refOpen, setRefOpen] = useState(false); // reference image dialog

  const finished = useMemo(
    () => order.every((tileId, pos) => tileId === pos),
    [order]
  );

  const timePct = Math.max(0, (secondsLeft / TIMER_SECONDS) * 100);
  const progressPct = (credited.size / totalTiles) * 100;

  /* ---------- Server lock + resume ---------- */
  useEffect(() => {
    (async () => {
      // 1) If locally marked done, lock immediately (no replay on reload)
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
        return; // do not query server; user is locked on this device
      }

      // 2) Otherwise ask server if submitted
      try {
        const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
        const uuid = user?.uuid || user?.uniqueNo;
        if (!uuid) {
          setServerLockChecked(true);
          return;
        }

        const { data } = await axios.get(
          `${baseUrl}/api/asian-paint/score/status`,
          {
            params: { uuid, game: "jigsaw", day: dayKey },
          }
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
          // Not submitted anywhere: resume local progress if any
          try {
            const raw = localStorage.getItem(KEYS.state);
            if (raw) {
              const saved = JSON.parse(raw);
              if (
                Array.isArray(saved.order) &&
                saved.order.length === ROWS * COLS
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
        // offline: nothing else to do here
      } finally {
        setServerLockChecked(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

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
    if (finished || timeUp) {
      localStorage.setItem(KEYS.done, "true");
      localStorage.setItem(KEYS.final, String(score)); // <— persist final score for reloads
      localStorage.removeItem(KEYS.state);
      localStorage.removeItem(KEYS.timer);
      setAlreadySubmitted(true); // <— lock NOW (no replay before reload)
      submitScore(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, timeUp, serverLockChecked, alreadySubmitted]);

  /* ---------- Game logic ---------- */
  const swap = (i, j) => {
    if (finished || timeUp || alreadySubmitted) return;
    setOrder((prev) => {
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
    if (selectedIndex === null) {
      setSelectedIndex(boardIndex);
    } else if (selectedIndex === boardIndex) {
      setSelectedIndex(null);
    } else {
      swap(selectedIndex, boardIndex);
      setSelectedIndex(null);
    }
  };

  const reshuffle = () => {
    if (alreadySubmitted || timeUp || finished) return;
    const shuf = shuffle(solvedOrder);
    if (shuf.every((v, i) => v === i)) shuf.reverse();
    setOrder(shuf);
    setSelectedIndex(null);
    setCredited(new Set());
    setScore(0);
  };

  /* ---------- Loading ---------- */
  if (!serverLockChecked) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography>Checking attempt status…</Typography>
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
          top: 58,
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
              }}
              align="center"
              color="primary.light"
            >
              {dayKey.toUpperCase()} – Jigsaw Puzzle
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

              {/* <Typography
                variant="caption"
                color="rgba(255,255,255,0.75)"
                sx={{ mt: 0.5, display: "block" }}
              >
                Scores auto-save to the backend.
              </Typography> */}

              {/* Time bar */}
              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={timePct}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: "rgba(255,255,255,0.08)",
                  }}
                />
              </Box>

              {/* Placement progress */}
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={progressPct}
                  sx={{
                    height: 6,
                    borderRadius: 999,
                    bgcolor: "rgba(255,255,255,0.06)",
                  }}
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
                // subheader={
                //   <Typography variant="body2" color="rgba(255,255,255,0.8)">
                //     Day-specific image, points, and timer are set in{" "}
                //     <strong>DAY_CFG</strong>.
                //   </Typography>
                // }
              />
              <CardContent sx={{ p: { xs: 1, md: 2 }, overflowX: "hidden" }}>
                {/* Wrapper whose width we observe precisely */}
                <Box
                  ref={wrapRef}
                  sx={{
                    width: "100%", // take full content width
                    maxWidth: "100%",
                    mx: "auto",
                    overflow: "hidden", // NO horizontal scroll
                    boxSizing: "border-box",
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
                      //   background: "rgba(255,255,255,0.04)",
                      borderRadius: 2,
                      overflow: "hidden",
                      mx: "auto",
                    }}
                  >
                    {order.map((tileId, pos) => {
                      const correct = tileId === pos || credited.has(pos);
                      const selected =
                        selectedIndex === pos &&
                        !alreadySubmitted &&
                        !timeUp &&
                        !finished;

                      return (
                        <Box
                          key={pos}
                          role="button"
                          aria-label={`Tile ${pos}`}
                          onClick={() => handleTileTap(pos)}
                          sx={{
                            width: `${cellPx}px`,
                            height: `${cellPx}px`,
                            borderRadius: 0.8,
                            position: "relative",
                            overflow: "hidden",
                            outline: selected
                              ? "3px solid rgba(25,118,210,0.9)"
                              : "1px solid rgba(255,255,255,0.12)",
                            boxShadow: correct
                              ? "inset 0 0 0 2px rgba(56,142,60,0.9), 0 4px 10px rgba(0,0,0,0.3)"
                              : "0 4px 10px rgba(0,0,0,0.25)",
                            cursor:
                              alreadySubmitted || timeUp || finished
                                ? "default"
                                : "pointer",
                            backgroundImage: `url(${puzzleImg})`,
                            backgroundSize: `${gridWidth}px ${gridHeight}px`,
                            backgroundPosition: bgPosForTile(
                              tileId,
                              gridWidth,
                              gridHeight
                            ),
                            transition:
                              "outline 120ms, box-shadow 120ms, transform 120ms",
                            "&:active": {
                              transform:
                                alreadySubmitted || timeUp || finished
                                  ? "none"
                                  : "scale(0.98)",
                            },
                          }}
                        />
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
