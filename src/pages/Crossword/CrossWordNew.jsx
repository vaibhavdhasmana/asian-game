// src/pages/Crossword/CrosswordMUI.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  TextField,
  IconButton,
  LinearProgress,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useGameSettings from "../../hooks/useGameSettings";
import { baseUrl } from "../../components/constant/constant";

/* ==============================
   CONFIG
   ============================== */
const POINTS_PER_WORD = 10;

// Responsive baseline
const MIN_REF_WIDTH = 370;
const MAX_REF_WIDTH = 760;
const CELL_MIN = 34; // big enough for thumbs
const CELL_MAX = 52;
const GRID_GAP = 4;

// API base
// use shared baseUrl

/* ==============================
   MINI CROSSWORD 9x9 with Across + Down
   ============================== */
const ROWS = 9;
const COLS = 9;

// Across entries
const ACROSS = [
  {
    id: "A1",
    clue: "Capital city on the Thames (6)",
    answer: "LONDON",
    r: 0,
    c: 0,
    dir: "across",
  },
  {
    id: "A2",
    clue: "Classic British afternoon drink (3)",
    answer: "TEA",
    r: 2,
    c: 0,
    dir: "across",
  },
  {
    id: "A3",
    clue: "Famed clock tower beside Westminster (6)",
    answer: "BIGBEN",
    r: 4,
    c: 0,
    dir: "across",
  },
  {
    id: "A4",
    clue: "Art tools for painting (7)",
    answer: "BRUSHES",
    r: 6,
    c: 2,
    dir: "across",
  },
];

// Down entries
const DOWN = [
  {
    id: "D1",
    clue: "Tidy, orderly (4)",
    answer: "NEAT",
    r: 0,
    c: 2,
    dir: "down",
  },
  {
    id: "D2",
    clue: "Entryway barrier (4)",
    answer: "DOOR",
    r: 0,
    c: 3,
    dir: "down",
  },
  {
    id: "D3",
    clue: "Plural of 'one' (4)",
    answer: "ONES",
    r: 0,
    c: 4,
    dir: "down",
  },
  {
    id: "D4",
    clue: "Opposite of 'some' (4)",
    answer: "NONE",
    r: 0,
    c: 5,
    dir: "down",
  },
  {
    id: "D5",
    clue: "Vase material, famously fragile (3)",
    answer: "URN",
    r: 6,
    c: 4,
    dir: "down",
  },
  {
    id: "D6",
    clue: "Farmyard bird (3)",
    answer: "HEN",
    r: 6,
    c: 6,
    dir: "down",
  },
  { id: "D7", clue: "Ocean (3)", answer: "SEA", r: 6, c: 8, dir: "down" },
];

const ENTRIES = [...ACROSS, ...DOWN];

/* ==============================
   Helpers
   ============================== */
const buildBaseGrid = () => {
  const grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => "#")
  );
  for (const e of ENTRIES) {
    for (let i = 0; i < e.answer.length; i++) {
      const rr = e.dir === "across" ? e.r : e.r + i;
      const cc = e.dir === "across" ? e.c + i : e.c;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS)
        throw new Error(`Entry ${e.id} OOB`);
      grid[rr][cc] = ""; // fillable
    }
  }
  return grid;
};

const indexEntriesByCell = (entries) => {
  const map = new Map(); // "r,c" -> [entries...]
  for (const e of entries) {
    for (let i = 0; i < e.answer.length; i++) {
      const rr = e.dir === "across" ? e.r : e.r + i;
      const cc = e.dir === "across" ? e.c + i : e.c;
      const key = `${rr},${cc}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
  }
  return map;
};

// Debounce with requestAnimationFrame
const rafDebounce = (fn) => {
  let raf = 0;
  return (...args) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => fn(...args));
  };
};

export default function CrossWordNew() {
  const navigate = useNavigate();

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
    return ["day1", "day2", "day3", "day4"].includes(v) ? v : "day1";
  }, [rawDay]);
  const slot = Number(gs.currentSlot) || 1;

  const KEYS = useMemo(
    () => ({
      user: "ap_user",
      state: `ap_cw_state_${dayKey}_v2`,
      done: `ap_cw_completed_${dayKey}_v2`,
    }),
    [dayKey]
  );

  /* ---------- Sizing ---------- */
  const wrapRef = useRef(null);
  const [cellPx, setCellPx] = useState(CELL_MIN);
  const [gridWidth, setGridWidth] = useState(MIN_REF_WIDTH);

  const computeSizes = () => {
    const containerWidth = wrapRef.current?.clientWidth || window.innerWidth;
    const refWidth = Math.max(
      MIN_REF_WIDTH,
      Math.min(containerWidth, MAX_REF_WIDTH)
    );
    const totalGaps = GRID_GAP * (COLS - 1);
    const rawCell = Math.floor((refWidth - totalGaps) / COLS);
    const nextCell = Math.max(CELL_MIN, Math.min(CELL_MAX, rawCell));
    const nextGridWidth = nextCell * COLS + totalGaps;
    setCellPx(nextCell);
    setGridWidth(
      Math.min(
        nextGridWidth,
        containerWidth >= MIN_REF_WIDTH ? refWidth : nextGridWidth
      )
    );
  };

  useEffect(() => {
    const recompute = rafDebounce(computeSizes);
    recompute();

    const events = [
      "resize",
      "orientationchange",
      "scroll",
      "focusin",
      "focusout",
    ];
    events.forEach((ev) =>
      window.addEventListener(ev, recompute, { passive: true })
    );

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, recompute));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Data ---------- */
  const baseGrid = useMemo(buildBaseGrid, []);
  const cellToEntries = useMemo(() => indexEntriesByCell(ENTRIES), []);
  const totalPoints = ENTRIES.length * POINTS_PER_WORD;

  /* ---------- State ---------- */
  const [letters, setLetters] = useState(() =>
    baseGrid.map((row) => row.map((v) => (v === "#" ? "#" : "")))
  );
  const [solved, setSolved] = useState(() => new Set()); // entry.id
  const [score, setScore] = useState(0);
  const [focus, setFocus] = useState(null); // { r, c }
  const [focusDir, setFocusDir] = useState("across"); // "across" | "down"
  const [snack, setSnack] = useState({ open: false, message: "" });

  const [serverLockChecked, setServerLockChecked] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const finished = solved.size === ENTRIES.length;

  // refs to the actual input elements so mobile keyboard opens
  const inputRefs = useRef(new Map());
  const keyAt = (r, c) => `${r},${c}`;
  const focusInput = (r, c) => {
    const el = inputRefs.current.get(keyAt(r, c));
    if (el && typeof el.focus === "function") {
      // preventScroll so the viewport doesn't jump around
      el.focus({ preventScroll: true });
      // a second focus after paint helps on some Android WebViews
      setTimeout(() => el.focus({ preventScroll: true }), 0);
    }
  };

  /* ---------- Server lock + resume ---------- */
  useEffect(() => {
    (async () => {
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
            params: { uuid, game: "crossWord", day: dayKey, slot },
          }
        );
        if (data?.submitted) {
          localStorage.setItem(KEYS.done, "true");
          setAlreadySubmitted(true);

          // Fill solution
          const filled = baseGrid.map((row, r) =>
            row.map((cell, c) => {
              if (cell === "#") return "#";
              const entries = cellToEntries.get(`${r},${c}`) || [];
              const e = entries[0]; // across/down letter is the same
              const idx = e.dir === "across" ? c - e.c : r - e.r;
              return e.answer[idx] || "";
            })
          );
          setLetters(filled);
          setSolved(new Set(ENTRIES.map((e) => e.id)));
          setScore(typeof data.points === "number" ? data.points : totalPoints);
        } else {
          localStorage.removeItem(KEYS.done);
          setAlreadySubmitted(false);
          // Load local progress
          try {
            const raw = localStorage.getItem(KEYS.state);
            if (raw) {
              const saved = JSON.parse(raw);
              if (saved?.letters) setLetters(saved.letters);
              if (Array.isArray(saved?.solved))
                setSolved(new Set(saved.solved));
              if (typeof saved?.score === "number") setScore(saved.score);
              if (saved?.focus) setFocus(saved.focus);
              if (saved?.focusDir) setFocusDir(saved.focusDir);
            }
          } catch {}
        }
      } catch {
        const localDone = localStorage.getItem(KEYS.done) === "true";
        setAlreadySubmitted(localDone);
        if (localDone) {
          setSolved(new Set(ENTRIES.map((e) => e.id)));
          setScore(totalPoints);
        }
      } finally {
        setServerLockChecked(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  // Persist local progress
  useEffect(() => {
    if (!serverLockChecked || alreadySubmitted) return;
    const payload = {
      letters,
      solved: Array.from(solved),
      score,
      focus,
      focusDir,
    };
    localStorage.setItem(KEYS.state, JSON.stringify(payload));
  }, [
    letters,
    solved,
    score,
    focus,
    focusDir,
    alreadySubmitted,
    serverLockChecked,
    KEYS.state,
  ]);

  /* ---------- DB upserts ---------- */
  const upsertScore = async (points) => {
    try {
      const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
      const uuid = user?.uuid || user?.uniqueNo;
      if (!uuid) return;
      await axios.post(`${baseUrl}/api/asian-paint/score`, {
        uuid,
        game: "crossWord",
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
        game: "crossWord",
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
      submitScore(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, serverLockChecked, alreadySubmitted]);

  /* ---------- Focus & input ---------- */
  const entriesAt = (r, c) => cellToEntries.get(`${r},${c}`) || [];
  const entryAt = (r, c, prefDir) => {
    const arr = entriesAt(r, c);
    if (!arr.length) return null;
    const found = arr.find((e) => e.dir === prefDir);
    return found || arr[0];
  };

  const toggleDirAtCell = (r, c) => {
    const arr = entriesAt(r, c);
    if (arr.length < 2) return;
    setFocusDir((d) => (d === "across" ? "down" : "across"));
  };

  const handleCellClick = (r, c) => {
    if (alreadySubmitted || !serverLockChecked) return;
    if (baseGrid[r][c] === "#") return;
    if (focus && focus.r === r && focus.c === c) {
      toggleDirAtCell(r, c);
    } else {
      const e = entryAt(r, c, focusDir) || entryAt(r, c, "across");
      if (e) setFocusDir(e.dir);
      setFocus({ r, c });
    }
    // ALWAYS focus the input so the keyboard opens
    setTimeout(() => focusInput(r, c), 0);
  };

  // When focus coordinates change (via arrows/auto-advance), focus the input
  useEffect(() => {
    if (focus) focusInput(focus.r, focus.c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const moveWithinEntry = (entry, r, c, delta) => {
    const idx = entry.dir === "across" ? c - entry.c : r - entry.r;
    const nextIdx = Math.max(0, Math.min(entry.answer.length - 1, idx + delta));
    const nr = entry.dir === "across" ? r : entry.r + nextIdx;
    const nc = entry.dir === "across" ? entry.c + nextIdx : c;
    setFocus({ r: nr, c: nc });
  };

  // Desktop/physical keyboard
  const handleKeyDown = (e) => {
    if (!focus || alreadySubmitted || !serverLockChecked) return;
    const { r, c } = focus;
    if (baseGrid[r][c] === "#") return;

    const entry = entryAt(r, c, focusDir);
    if (!entry) return;

    if (e.key === "ArrowLeft") {
      if (focusDir === "across") moveWithinEntry(entry, r, c, -1);
      else setFocusDir("across");
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowRight") {
      if (focusDir === "across") moveWithinEntry(entry, r, c, +1);
      else setFocusDir("across");
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowUp") {
      if (focusDir === "down") moveWithinEntry(entry, r, c, -1);
      else setFocusDir("down");
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      if (focusDir === "down") moveWithinEntry(entry, r, c, +1);
      else setFocusDir("down");
      e.preventDefault();
      return;
    }
    if (e.key === "Backspace") {
      setLetters((prev) => {
        const n = prev.map((row) => row.slice());
        n[r][c] = "";
        return n;
      });
      e.preventDefault();
      return;
    }
    if (e.key === " " || e.key === "Tab") {
      toggleDirAtCell(r, c);
      e.preventDefault();
      return;
    }

    const ch = e.key.toUpperCase();
    if (/^[A-Z]$/.test(ch)) {
      setLetters((prev) => {
        const n = prev.map((row) => row.slice());
        n[r][c] = ch;
        return n;
      });
      moveWithinEntry(entry, r, c, +1);
      e.preventDefault();
    }
  };

  // MOBILE-SAFE: handle typing via onChange on the input itself
  const handleInputChange = (r, c, raw) => {
    if (alreadySubmitted || !serverLockChecked) return;
    // keep only A-Z and take the last typed letter
    const match = String(raw || "")
      .toUpperCase()
      .match(/[A-Z]/g);
    const ch = match ? match[match.length - 1] : "";

    setLetters((prev) => {
      const n = prev.map((row) => row.slice());
      n[r][c] = ch;
      return n;
    });

    if (ch) {
      const e = entryAt(r, c, focusDir);
      if (e) moveWithinEntry(e, r, c, +1);
    }
  };

  /* ---------- Solve detection (+ scoring & upsert) ---------- */
  useEffect(() => {
    if (!serverLockChecked || alreadySubmitted) return;
    const newlySolved = [];
    for (const e of ENTRIES) {
      if (solved.has(e.id)) continue;
      let s = "";
      for (let i = 0; i < e.answer.length; i++) {
        const rr = e.dir === "across" ? e.r : e.r + i;
        const cc = e.dir === "across" ? e.c + i : e.c;
        const ch = letters[rr][cc];
        if (!ch || ch === "#") {
          s = null;
          break;
        }
        s += ch;
      }
      if (s && s === e.answer) newlySolved.push(e.id);
    }
    if (!newlySolved.length) return;

    setSolved((prev) => {
      const next = new Set(prev);
      newlySolved.forEach((id) => next.add(id));
      return next;
    });
    setScore((prev) => {
      const next = prev + newlySolved.length * POINTS_PER_WORD;
      upsertScore(next); // update user's day score after each correct word
      return next;
    });
    setSnack({
      open: true,
      message: `Correct! +${newlySolved.length * POINTS_PER_WORD}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letters]);

  /* ---------- UI helpers ---------- */
  const isBlocked = (r, c) => baseGrid[r][c] === "#";

  const highlightKeys = useMemo(() => {
    if (!focus) return new Set();
    const arr = cellToEntries.get(`${focus.r},${focus.c}`) || [];
    const e = arr.find((x) => x.dir === focusDir) || arr[0];
    if (!e) return new Set();
    const s = new Set();
    for (let i = 0; i < e.answer.length; i++) {
      const rr = e.dir === "across" ? e.r : e.r + i;
      const cc = e.dir === "across" ? e.c + i : e.c;
      s.add(`${rr},${cc}`);
    }
    return s;
  }, [focus, focusDir, cellToEntries]);

  const cellStyles = (r, c) => {
    if (isBlocked(r, c)) {
      return {
        backgroundColor: "rgba(9,20,40,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
      };
    }
    const entries = cellToEntries.get(`${r},${c}`) || [];
    const solvedHere = entries.some((e) => solved.has(e.id));
    const isFocusCell = focus && focus.r === r && focus.c === c;
    const inPath = highlightKeys.has(`${r},${c}`);

    return {
      background: solvedHere
        ? "linear-gradient(180deg, rgba(56, 142, 60, 0.25), rgba(56, 142, 60, 0.35))"
        : inPath
        ? "linear-gradient(180deg, rgba(25,118,210,0.25), rgba(25,118,210,0.35))"
        : "rgba(255,255,255,0.08)",
      border: `1px solid ${
        solvedHere
          ? "rgba(56,142,60,0.8)"
          : inPath
          ? "rgba(25,118,210,0.8)"
          : "rgba(255,255,255,0.12)"
      }`,
      boxShadow: isFocusCell ? "0 0 0 2px rgba(25,118,210,0.9) inset" : "none",
    };
  };

  const progressPct = (solved.size / ENTRIES.length) * 100;

  /* ---------- Loading ---------- */
  if (!serverLockChecked) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography>Checking attempt status...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        WebkitTextSizeAdjust: "100%", // stabilize iOS text sizing
        bgcolor: "rgb(11,16,34)",
        backgroundImage:
          "radial-gradient(60rem 60rem at -20% -10%, rgba(33,150,243,0.08), transparent), radial-gradient(40rem 40rem at 120% 110%, rgba(76,175,80,0.08), transparent)",
        py: { xs: 2, md: 4 },
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Home (top-right) */}
      <IconButton
        aria-label="Home"
        onClick={() => navigate("/")}
        sx={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 10,
          color: "white",
        }}
      >
        <HomeIcon />
      </IconButton>

      <Grid container justifyContent="center" sx={{ px: "12px" }}>
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
              {dayKey.toUpperCase()} – Crossword
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
                      / {ENTRIES.length * POINTS_PER_WORD}
                    </Typography>
                  }
                  variant="outlined"
                  sx={{ bgcolor: "rgba(255,255,255,0.04)" }}
                />
                <Typography fontWeight={800} color="rgba(255,255,255,0.9)">
                  {POINTS_PER_WORD} points per word • {solved.size} /{" "}
                  {ENTRIES.length} solved
                </Typography>
                <Stack direction="row" spacing={1}>
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
                  <Chip
                    icon={<SwapHorizIcon />}
                    label={focusDir.toUpperCase()}
                    variant="outlined"
                    onClick={() =>
                      setFocusDir((d) => (d === "across" ? "down" : "across"))
                    }
                    sx={{ bgcolor: "rgba(255,255,255,0.04)" }}
                  />
                </Stack>
              </Stack>

              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={progressPct}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: "rgba(255,255,255,0.08)",
                  }}
                />
              </Box>
            </Paper>

            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.12)",
                bgcolor: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(6px)",
              }}
            >
              <CardContent>
                <Box
                  ref={wrapRef}
                  sx={{
                    width: "100%",
                    overflowX: "auto",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: `${gridWidth}px`,
                      display: "grid",
                      gridTemplateColumns: `repeat(${COLS}, ${cellPx}px)`,
                      gap: `${GRID_GAP}px`,
                      justifyContent: "center",
                      userSelect: "none",
                      touchAction: "manipulation",
                      px: 0.5,
                      py: 0.5,
                    }}
                  >
                    {letters.map((row, r) =>
                      row.map((val, c) => {
                        const blocked = baseGrid[r][c] === "#";
                        const styles = cellStyles(r, c);
                        return (
                          <Box
                            key={`${r},${c}`}
                            onClick={() => handleCellClick(r, c)}
                            sx={{
                              width: `${cellPx}px`,
                              height: `${cellPx}px`,
                              borderRadius: 2.5,
                              display: "grid",
                              justifyContent: "center",
                              placeItems: "center",
                              ...styles,
                              transition:
                                "box-shadow 120ms, background 120ms, border-color 120ms",
                              position: "relative",
                            }}
                          >
                            {!blocked ? (
                              <TextField
                                value={val === "#" ? "" : val}
                                onChange={(e) =>
                                  handleInputChange(r, c, e.target.value)
                                }
                                onKeyDown={handleKeyDown} // still supports hardware keyboards
                                inputRef={(el) => {
                                  if (el)
                                    inputRefs.current.set(`${r},${c}`, el);
                                }}
                                inputProps={{
                                  maxLength: 1,
                                  inputMode: "text",
                                  pattern: "[A-Za-z]*",
                                  autoCapitalize: "characters",
                                  autoCorrect: "off",
                                  autoComplete: "off",
                                  spellCheck: false,
                                  style: {
                                    textTransform: "uppercase",
                                    fontWeight: 900,
                                    textAlign: "center",
                                    width: `${cellPx - 10}px`,
                                    fontSize: 20, // >=16px prevents iOS zoom
                                    lineHeight: 1.1,
                                    color: "#fff",
                                  },
                                  readOnly: alreadySubmitted,
                                }}
                                sx={{
                                  width: "100%",
                                  "& .MuiInputBase-input": {
                                    p: 0,
                                    textAlign: "center",
                                    fontSize: 20,
                                    lineHeight: 1.1,
                                    caretColor: "transparent",
                                    color: "#fff",
                                  },
                                  "& fieldset": { display: "none" }, // borderless
                                  background: "transparent",
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: `${cellPx - 10}px`,
                                  height: `${cellPx - 10}px`,
                                  borderRadius: 2,
                                  border: "1.5px solid rgba(255,255,255,0.06)",
                                }}
                              />
                            )}
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </Box>

                {finished && (
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

            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.12)",
                bgcolor: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(6px)",
              }}
            >
              <CardContent>
                <Typography
                  variant="subtitle1"
                  fontWeight={900}
                  gutterBottom
                  color="rgba(255,255,255,0.95)"
                >
                  Across
                </Typography>
                <Stack spacing={1.2} sx={{ mb: 2 }}>
                  {ACROSS.map((e) => (
                    <Stack
                      key={e.id}
                      direction="row"
                      alignItems="center"
                      spacing={1.2}
                      sx={{ opacity: solved.has(e.id) ? 0.7 : 1 }}
                    >
                      <Chip
                        size="small"
                        label={e.id}
                        color={solved.has(e.id) ? "success" : "default"}
                        variant={solved.has(e.id) ? "filled" : "outlined"}
                        onClick={() => {
                          setFocus({ r: e.r, c: e.c });
                          setFocusDir("across");
                          setTimeout(() => focusInput(e.r, e.c), 0);
                        }}
                      />
                      <Typography variant="body1" color="rgba(255,255,255,0.9)">
                        {e.clue}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                <Typography
                  variant="subtitle1"
                  fontWeight={900}
                  gutterBottom
                  color="rgba(255,255,255,0.95)"
                >
                  Down
                </Typography>
                <Stack spacing={1.2}>
                  {DOWN.map((e) => (
                    <Stack
                      key={e.id}
                      direction="row"
                      alignItems="center"
                      spacing={1.2}
                      sx={{ opacity: solved.has(e.id) ? 0.7 : 1 }}
                    >
                      <Chip
                        size="small"
                        label={e.id}
                        color={solved.has(e.id) ? "success" : "default"}
                        variant={solved.has(e.id) ? "filled" : "outlined"}
                        onClick={() => {
                          setFocus({ r: e.r, c: e.c });
                          setFocusDir("down");
                          setTimeout(() => focusInput(e.r, e.c), 0);
                        }}
                      />
                      <Typography variant="body1" color="rgba(255,255,255,0.9)">
                        {e.clue}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
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
