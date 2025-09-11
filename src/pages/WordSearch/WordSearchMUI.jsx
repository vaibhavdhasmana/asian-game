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
import { useNavigate, useSearchParams } from "react-router-dom";
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

// Words are provided by server when available; otherwise fallback is used below.

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
   Placements (generated or server-provided)
   ============================== */

// Generate mixed-direction placements for a list of words deterministically
function generatePlacements(words, seedString = "seed") {
  const dirs = [
    [0, 1], // →
    [1, 0], // ↓
    [1, 1], // ↘
    [-1, 1], // ↗
  ];
  const grid = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => "")
  );
  const rng = mulberry32(hashString(String(seedString)));

  const placements = [];

  function canPlace(word, sr, sc, dr, dc) {
    for (let i = 0; i < word.length; i++) {
      const r = sr + dr * i;
      const c = sc + dc * i;
      if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) return false;
      const existing = grid[r][c];
      if (existing && existing !== word[i]) return false;
    }
    return true;
  }

  function place(word, sr, sc, dr, dc) {
    for (let i = 0; i < word.length; i++) {
      const r = sr + dr * i;
      const c = sc + dc * i;
      grid[r][c] = word[i];
    }
    placements.push({ word, start: [sr, sc], dir: [dr, dc] });
  }

  function boundsFor(wordLen, dr, dc) {
    let rMin = 0,
      rMax = GRID_SIZE - 1,
      cMin = 0,
      cMax = GRID_SIZE - 1;
    if (dr > 0) rMax = GRID_SIZE - wordLen;
    if (dr < 0) rMin = wordLen - 1;
    if (dc > 0) cMax = GRID_SIZE - wordLen;
    if (dc < 0) cMin = wordLen - 1;
    if (rMin > rMax || cMin > cMax) return null;
    return { rMin, rMax, cMin, cMax };
  }

  words.forEach((w, idx) => {
    const word = String(w).toUpperCase();
    if (!word || word.length < 2 || word.length > GRID_SIZE) return;

    // Try some random directions/starts deterministically
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const dir = dirs[Math.floor(rng() * dirs.length)];
      const [dr, dc] = dir;
      const b = boundsFor(word.length, dr, dc);
      if (!b) continue;
      const sr = b.rMin + Math.floor(rng() * (b.rMax - b.rMin + 1));
      const sc = b.cMin + Math.floor(rng() * (b.cMax - b.cMin + 1));
      if (canPlace(word, sr, sc, dr, dc)) {
        place(word, sr, sc, dr, dc);
        placed = true;
      }
    }

    // Deterministic sweep fallback if random tries fail
    if (!placed) {
      for (let d = 0; d < dirs.length && !placed; d++) {
        const [dr, dc] = dirs[(idx + d) % dirs.length];
        const b = boundsFor(word.length, dr, dc);
        if (!b) continue;
        for (let sr = b.rMin; sr <= b.rMax && !placed; sr++) {
          for (let sc = b.cMin; sc <= b.cMax && !placed; sc++) {
            if (canPlace(word, sr, sc, dr, dc)) {
              place(word, sr, sc, dr, dc);
              placed = true;
            }
          }
        }
      }
    }

    // Final safety: place horizontally if still not placed
    if (!placed) {
      const dr = 0,
        dc = 1;
      const b = boundsFor(word.length, dr, dc);
      const sr = Math.min(GRID_SIZE - 1, idx);
      const sc = b ? b.cMin : 0;
      const ok = b && canPlace(word, sr, sc, dr, dc);
      place(word, ok ? sr : 0, ok ? sc : 0, dr, dc);
    }
  });

  return placements;
}

function buildGrid(seedString = "default", placementsList) {
  if (!Array.isArray(placementsList) || placementsList.length === 0) return null;
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
  const [searchParams] = useSearchParams();

  // Active day (from settings)
  const gs = useGameSettings() || {};
  const queryDay = (searchParams.get("day") || "").toLowerCase();
  const rawFromSettings =
    gs.activeDay ||
    gs.day ||
    gs.currentDay ||
    gs.gameDay ||
    gs.settings?.activeDay ||
    gs.settings?.day ||
    "day1";

  const dayKey = useMemo(() => {
    const v = queryDay || String(rawFromSettings).toLowerCase();
    return ["day1", "day2", "day3"].includes(v) ? v : "day1";
  }, [queryDay, rawFromSettings]);
  const slot = useMemo(() => {
    const s = parseInt(searchParams.get("slot"), 10);
    if (Number.isFinite(s) && s > 0) return s;
    return Number(gs.currentSlot) || 1;
  }, [searchParams, gs.currentSlot]);

  // LocalStorage keys (per day+slot)
  const KEYS = useMemo(
    () => ({
      user: "ap_user",
      state: `ap_ws_state_${dayKey}_s${slot}_v4`,
      done: `ap_ws_completed_${dayKey}_s${slot}_v4`,
      grid: `ap_ws_grid_${dayKey}_s${slot}_v4`,
      version: `ap_ws_version_${dayKey}_s${slot}_v4`,
      words: `ap_ws_words_${dayKey}_s${slot}_v4`,
    }),
    [dayKey, slot]
  );

  // Server-driven overrides (optional)
  const [contentVersion, setContentVersion] = useState(0);
  const [pointsPerWord, setPointsPerWord] = useState(POINTS_PER_WORD);
  const [serverWords, setServerWords] = useState(null);
  const [serverPlacements, setServerPlacements] = useState(null);
  const WORDS = useMemo(() => serverWords || [], [serverWords]);
  const hasWords = WORDS.length > 0;
  const placementsList = useMemo(() => {
    if (serverPlacements && serverPlacements.length) return serverPlacements;
    if (serverWords && serverWords.length) {
      const upper = serverWords.map((w) => String(w).toUpperCase());
      const seed = `${dayKey}|${slot}|${contentVersion || 0}|${upper.join(",")}`;
      return generatePlacements(upper, seed);
    }
    return null; // no defaults; wait for server
  }, [serverPlacements, serverWords, dayKey, slot, contentVersion]);

  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
        const uuid = user?.uuid || user?.uniqueNo;
        const { data } = await axios.get(`${baseUrl}/api/asian-paint/content`, {
          params: { day: dayKey, game: "wordSearch", uuid, slot },
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
  }, [dayKey, slot]);

  // When day/slot changes, clear previous content snapshot so we don't reuse old content
  useEffect(() => {
    setServerWords(null);
    setServerPlacements(null);
    setContentVersion(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, slot]);

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

  // When day or slot changes, clear lock state until fresh status is fetched
  useEffect(() => {
    setServerLockChecked(false);
    setAlreadySubmitted(false);
  }, [dayKey, slot]);

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
    // No saved grid; if we don't have placements yet, don't create a default grid.
    const g = buildGrid(`ws-${dayKey}-9x9`, placementsList);
    if (g) {
      localStorage.setItem(KEYS.grid, JSON.stringify(g));
      try {
        const currentWords = JSON.stringify(
          (placementsList || []).map((p) => p.word)
        );
        localStorage.setItem(KEYS.words, currentWords);
      } catch {}
      return g;
    }
    return null;
  });

  // On day/slot change, swap in saved grid for that scope if available; else wait
  useEffect(() => {
    try {
      const fromLS = localStorage.getItem(KEYS.grid);
      if (fromLS) {
        const parsed = JSON.parse(fromLS);
        if (
          Array.isArray(parsed) &&
          parsed.length === GRID_SIZE &&
          parsed[0].length === GRID_SIZE
        ) {
          setGrid(parsed);
          return;
        }
      }
    } catch {}
    setGrid(null); // trigger loading state until placements/content arrive and grid is built
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, slot]);
  const [foundWords, setFoundWords] = useState(() => {
    try {
      const raw = localStorage.getItem(
        `ap_ws_state_${dayKey}_s${slot}_v4`
      );
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.foundWords)) return new Set(saved.foundWords);
      }
    } catch {}
    return new Set();
  });
  const [foundCells, setFoundCells] = useState(() => {
    try {
      const raw = localStorage.getItem(
        `ap_ws_state_${dayKey}_s${slot}_v4`
      );
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.foundCells)) return new Set(saved.foundCells);
      }
    } catch {}
    return new Set();
  });
  const [score, setScore] = useState(() => {
    try {
      const raw = localStorage.getItem(
        `ap_ws_state_${dayKey}_s${slot}_v4`
      );
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.score === "number") return saved.score;
      }
    } catch {}
    return 0;
  });
  const [hydrated, setHydrated] = useState(false);
  // When content or slot/day changes, (re)build grid if version or words change.
  // Preserve in-progress games if content version and words haven't changed.
  useEffect(() => {
    try {
      const hasGrid = !!localStorage.getItem(KEYS.grid);
      const hasState = !!localStorage.getItem(KEYS.state);
      const oldVer = Number(localStorage.getItem(KEYS.version) || "0");
      const newVer = Number(contentVersion) || 0;
      const currentWords = JSON.stringify(
        (placementsList || []).map((p) => p.word)
      );
      const storedWords = localStorage.getItem(KEYS.words) || "";
      const wordsMatch = storedWords === currentWords;

      // If server content hasn't arrived yet, do nothing.
      const awaitingServer = !serverPlacements && !serverWords;
      if (awaitingServer) return;

      // If we already have a grid and both version and words match, keep everything.
      if (hasGrid && oldVer === newVer && wordsMatch) return;

      // If we have existing progress but no stored version yet, and the words match
      // the server payload, just adopt the new version without clearing.
      if (hasGrid && (hasState || storedWords) && oldVer === 0 && newVer > 0 && wordsMatch) {
        localStorage.setItem(KEYS.version, String(newVer));
        return;
      }
      // If we have explicit local progress (hasState) but no stored version yet,
      // adopt the new version even if wordsMatch is indeterminate. Prefer preserving
      // the player's progress on the first versioned rollout.
      if (hasGrid && hasState && oldVer === 0 && newVer > 0) {
        localStorage.setItem(KEYS.version, String(newVer));
        return;
      }

      // If content version differs OR words changed, rebuild and clear local progress for this day/slot.
      if (newVer !== oldVer || !wordsMatch) {
        const verSeed = newVer > 0 ? newVer : 0;
        const g = buildGrid(`ws-${dayKey}-9x9-v${verSeed}`, placementsList);
        if (!g) return;
        setGrid(g);
        setFoundWords(new Set());
        setFoundCells(new Set());
        setScore(0);
        localStorage.setItem(KEYS.grid, JSON.stringify(g));
        localStorage.setItem(KEYS.words, currentWords);
        if (verSeed > 0) localStorage.setItem(KEYS.version, String(verSeed));
        localStorage.removeItem(KEYS.state);
        localStorage.removeItem(KEYS.done);
        return;
      }

      // If no grid exists yet (fresh), build one using whatever placements we have.
      if (!hasGrid) {
        const seedVer = newVer > 0 ? newVer : 0;
        const g = buildGrid(`ws-${dayKey}-9x9-v${seedVer}`, placementsList);
        if (!g) return;
        setGrid(g);
        setFoundWords(new Set());
        setFoundCells(new Set());
        setScore(0);
        localStorage.setItem(KEYS.grid, JSON.stringify(g));
        localStorage.setItem(KEYS.words, currentWords);
        if (seedVer > 0) localStorage.setItem(KEYS.version, String(seedVer));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, slot, contentVersion, placementsList]);

  // selection + live preview
  const [isDragging, setIsDragging] = useState(false);
  const [selectStart, setSelectStart] = useState(null); // [r,c]
  const [selectEnd, setSelectEnd] = useState(null); // [r,c]
  const usingTouchRef = useRef(false);

  const [snack, setSnack] = useState({ open: false, message: "" });

  const totalPoints = WORDS.length * pointsPerWord;
  // Only treat as finished once words are actually loaded
  const finished = hasWords && foundWords.size === WORDS.length;

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
          // No user → don't lock; continue with local progress
          setAlreadySubmitted(localStorage.getItem(KEYS.done) === "true");
          setServerLockChecked(true);
          return;
        }
        const { data } = await axios.get(
          `${baseUrl}/api/asian-paint/score/status`,
          {
            params: { uuid, game: "wordSearch", day: dayKey, slot },
          }
        );
        if (data?.submitted) {
          localStorage.setItem(KEYS.done, "true");
          setAlreadySubmitted(true);
          const pts = Number(data.points) || 0;
          setScore(pts);
          // Only mark all words found if we actually know the word list
          if (hasWords && pts >= WORDS.length * pointsPerWord) {
            setFoundWords(new Set(WORDS));
          } else {
            // hydrate partial local progress but keep input disabled
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
          const localDone = localStorage.getItem(KEYS.done) === "true";
          if (localDone) {
            // Keep local lock until next slot even if server not yet updated
            setAlreadySubmitted(true);
            if (hasWords) {
              setFoundWords(new Set(WORDS));
              setScore(WORDS.length * pointsPerWord);
            }
          } else {
            setAlreadySubmitted(false);
          }
        }
      } catch {
        const localDone = localStorage.getItem(KEYS.done) === "true";
        setAlreadySubmitted(localDone);
        if (localDone && hasWords) {
          setFoundWords(new Set(WORDS));
          setScore(WORDS.length * pointsPerWord);
        }
      } finally {
        setServerLockChecked(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, KEYS.user, KEYS.done, slot, hasWords, WORDS, pointsPerWord]);

  /* ---------- Load local progress (eager, before server lock check) ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEYS.state);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.foundWords))
          setFoundWords(new Set(saved.foundWords));
        if (Array.isArray(saved.foundCells))
          setFoundCells(new Set(saved.foundCells));
        if (typeof saved.score === "number") setScore(saved.score);
      }
    } catch {}
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [KEYS.state]);

  /* ---------- Persist progress ---------- */
  useEffect(() => {
    if (alreadySubmitted || !hydrated) return;
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
    hydrated,
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
        slot,
        contentVersion: contentVersion || 0,
        payload: { found: foundWords.size, wordsMax: WORDS.length, pointsPerWord },
      });
      setSnack({ open: true, message: "Score submitted!" });
      localStorage.setItem(KEYS.done, "true");
      setAlreadySubmitted(true);
      // Ensure UI reflects final state
      try {
        setFoundWords(new Set(WORDS));
      } catch {}
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
            slot,
            points,
          });
          setSnack({ open: true, message: "Score submitted!" });
          localStorage.setItem(KEYS.done, "true");
          setAlreadySubmitted(true);
        } catch {
          setSnack({ open: true, message: "Saved locally (offline)" });
        }
      }
    }
  };

  useEffect(() => {
    // Avoid auto-submitting before content is loaded
    if (!serverLockChecked || alreadySubmitted) return;
    if (!hasWords || !grid) return;
    if (finished) {
      localStorage.setItem(KEYS.done, "true");
      localStorage.removeItem(KEYS.state);
      submitScore(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, serverLockChecked, alreadySubmitted, hasWords, grid]);

  /* ---------- UI ---------- */
  if (!serverLockChecked) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography>Checking attempt status...</Typography>
      </Box>
    );
  }

  // Wait for puzzle content (no default grid)
  if (!grid) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography>Loading puzzle...</Typography>
      </Box>
    );
  }

  const progressPct = hasWords ? (foundWords.size / WORDS.length) * 100 : 0;

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
                  {WORDS.map((w) => (
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





