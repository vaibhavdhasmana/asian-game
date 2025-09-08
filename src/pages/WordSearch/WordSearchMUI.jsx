// // src/pages/WordSearch/WordSearchMUI.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import {
//   Box,
//   Card,
//   CardContent,
//   CardHeader,
//   Typography,
//   Button,
//   Stack,
//   Chip,
//   Grid,
//   Paper,
//   Alert,
//   Snackbar,
//   LinearProgress,
// } from "@mui/material";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import CancelIcon from "@mui/icons-material/Cancel";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import useGameSettings from "../../hooks/useGameSettings";

// /* ==============================
//    CONFIG
//    ============================== */
// const POINTS_PER_WORD = 10;
// const GRID_SIZE = 12; // 12x12 grid

// // Base URL (same logic as the rest of the app)
// const baseUrl =
//   import.meta.env.VITE_APP_ENV === "local"
//     ? "http://localhost:7000"
//     : "https://api.nivabupalaunchevent.com";

// // Target words (ALL CAPS)
// const WORDS = ["TEXTURES", "BRUSHES", "LONDON", "BIGBEN", "BUCKINGHAM"];

// /* ==============================
//    Utility helpers
//    ============================== */
// const toKey = (r, c) => `${r},${c}`;
// const fromKey = (k) => k.split(",").map(Number);
// const directions = [
//   [0, 1], // →
//   [0, -1], // ←
//   [1, 0], // ↓
//   [-1, 0], // ↑
//   [1, 1], // ↘
//   [-1, -1], // ↖
//   [1, -1], // ↙
//   [-1, 1], // ↗
// ];

// // simple seeded RNG so grid letters are stable per-day
// function mulberry32(seed) {
//   return function () {
//     let t = (seed += 0x6d2b79f5);
//     t = Math.imul(t ^ (t >>> 15), t | 1);
//     t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
//     return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
//   };
// }

// function hashString(str) {
//   let h = 2166136261;
//   for (let i = 0; i < str.length; i++) {
//     h ^= str.charCodeAt(i);
//     h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
//   }
//   return h >>> 0;
// }

// /* ==============================
//    Predefined placements to ensure fit (12x12)
//    Coordinates are [row, col], 0-based.
//    ============================== */
// const placements = [
//   // TEXTURES: ↘ from (0,0)
//   { word: "TEXTURES", start: [0, 0], dir: [1, 1] },
//   // BRUSHES: ↓ from (0,10)
//   { word: "BRUSHES", start: [0, 10], dir: [1, 0] },
//   // LONDON: → from (11,0)
//   { word: "LONDON", start: [11, 0], dir: [0, 1] },
//   // BIGBEN: → from (9,1)
//   { word: "BIGBEN", start: [9, 1], dir: [0, 1] },
//   // BUCKINGHAM: ↓ from (1,0)
//   { word: "BUCKINGHAM", start: [1, 0], dir: [1, 0] },
// ];

// /* Build an empty grid, lay down the placements, then fill blanks with stable random letters. */
// function buildGrid(seedString = "default") {
//   const grid = Array.from({ length: GRID_SIZE }, () =>
//     Array.from({ length: GRID_SIZE }, () => "")
//   );

//   // Place words
//   placements.forEach(({ word, start, dir }) => {
//     const [sr, sc] = start;
//     const [dr, dc] = dir;
//     for (let i = 0; i < word.length; i++) {
//       const r = sr + dr * i;
//       const c = sc + dc * i;
//       if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) {
//         throw new Error(`Word ${word} goes out of bounds`);
//       }
//       const existing = grid[r][c];
//       if (existing && existing !== word[i]) {
//         throw new Error(`Conflict placing ${word} at ${r},${c}`);
//       }
//       grid[r][c] = word[i];
//     }
//   });

//   // Fill blanks with seeded random A-Z
//   const rng = mulberry32(hashString(seedString));
//   const A = "A".charCodeAt(0);
//   for (let r = 0; r < GRID_SIZE; r++) {
//     for (let c = 0; c < GRID_SIZE; c++) {
//       if (!grid[r][c]) {
//         const ch = String.fromCharCode(A + Math.floor(rng() * 26));
//         grid[r][c] = ch;
//       }
//     }
//   }
//   return grid;
// }

// /* ==============================
//    Component
//    ============================== */
// export default function WordSearchMUI() {
//   const navigate = useNavigate();

//   // Pull active day from game settings (same as Quiz)
//   const gs = useGameSettings() || {};
//   const rawFromSettings =
//     gs.activeDay ||
//     gs.day ||
//     gs.currentDay ||
//     gs.gameDay ||
//     gs.settings?.activeDay ||
//     gs.settings?.day ||
//     "day1";

//   const dayKey = useMemo(() => {
//     const v = String(rawFromSettings).toLowerCase();
//     return ["day1", "day2", "day3"].includes(v) ? v : "day1";
//   }, [rawFromSettings]);

//   // Keys per day
//   const KEYS = useMemo(
//     () => ({
//       user: "ap_user",
//       state: `ap_ws_state_${dayKey}`,
//       done: `ap_ws_completed_${dayKey}`,
//       grid: `ap_ws_grid_${dayKey}`,
//     }),
//     [dayKey]
//   );

//   // Server lock state
//   const [serverLockChecked, setServerLockChecked] = useState(false);
//   const [alreadySubmitted, setAlreadySubmitted] = useState(false);

//   // Game state
//   const [grid, setGrid] = useState(() => {
//     try {
//       const fromLS = localStorage.getItem(KEYS.grid);
//       if (fromLS) return JSON.parse(fromLS);
//     } catch {}
//     // seed ensures same letters per day
//     const g = buildGrid(`ws-${dayKey}`);
//     localStorage.setItem(KEYS.grid, JSON.stringify(g));
//     return g;
//   });
//   const [foundWords, setFoundWords] = useState(() => new Set()); // word strings
//   const [foundCells, setFoundCells] = useState(() => new Set()); // "r,c" keys
//   const [score, setScore] = useState(0);

//   // selection
//   const [selectStart, setSelectStart] = useState(null); // [r, c] | null
//   const [selectEnd, setSelectEnd] = useState(null); // [r, c] | null
//   const [statusMsg, setStatusMsg] = useState(null); // success/error message
//   const [snack, setSnack] = useState({ open: false, message: "" });

//   const totalPoints = WORDS.length * POINTS_PER_WORD;
//   const finished = foundWords.size === WORDS.length;

//   /* 1) SERVER LOCK CHECK */
//   useEffect(() => {
//     (async () => {
//       try {
//         const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
//         const uuid = user?.uuid || user?.uniqueNo;
//         if (!uuid) {
//           setAlreadySubmitted(false);
//           setServerLockChecked(true);
//           return;
//         }
//         const { data } = await axios.get(
//           `${baseUrl}/api/asian-paint/score/status`,
//           {
//             params: { uuid, game: "wordSearch", day: dayKey },
//           }
//         );
//         if (data?.submitted) {
//           localStorage.setItem(KEYS.done, "true");
//           setAlreadySubmitted(true);
//           if (typeof data.points === "number") {
//             setScore(data.points);
//           } else {
//             setScore(totalPoints); // fallback
//           }
//           // Mark all as found to render finished UI
//           const all = new Set(WORDS);
//           setFoundWords(all);
//         } else {
//           localStorage.removeItem(KEYS.done);
//           setAlreadySubmitted(false);
//         }
//       } catch {
//         const localDone = localStorage.getItem(KEYS.done) === "true";
//         setAlreadySubmitted(localDone);
//         if (localDone) {
//           setFoundWords(new Set(WORDS));
//           setScore(totalPoints);
//         }
//       } finally {
//         setServerLockChecked(true);
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [dayKey, KEYS.user, KEYS.done]);

//   /* 2) LOAD LOCAL PROGRESS if not server-locked */
//   useEffect(() => {
//     if (!serverLockChecked) return;
//     if (alreadySubmitted) return;
//     try {
//       const raw = localStorage.getItem(KEYS.state);
//       if (!raw) return;
//       const saved = JSON.parse(raw);
//       if (Array.isArray(saved.foundWords)) {
//         setFoundWords(new Set(saved.foundWords));
//       }
//       if (Array.isArray(saved.foundCells)) {
//         setFoundCells(new Set(saved.foundCells));
//       }
//       if (typeof saved.score === "number") setScore(saved.score);
//     } catch {}
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [serverLockChecked, alreadySubmitted, KEYS.state]);

//   /* 3) PERSIST PROGRESS */
//   useEffect(() => {
//     if (!serverLockChecked) return;
//     if (alreadySubmitted) return;
//     const payload = {
//       foundWords: Array.from(foundWords),
//       foundCells: Array.from(foundCells),
//       score,
//     };
//     localStorage.setItem(KEYS.state, JSON.stringify(payload));
//   }, [
//     foundWords,
//     foundCells,
//     score,
//     alreadySubmitted,
//     serverLockChecked,
//     KEYS.state,
//   ]);

//   /* Selection handlers: click start, click end (supports 8 directions) */
//   const onCellDown = (r, c) => {
//     if (!serverLockChecked || alreadySubmitted) return;
//     setSelectStart([r, c]);
//     setSelectEnd(null);
//     setStatusMsg(null);
//   };

//   const onCellUp = (r, c) => {
//     if (!serverLockChecked || alreadySubmitted) return;
//     if (!selectStart) return;

//     const [sr, sc] = selectStart;
//     const dr = r - sr;
//     const dc = c - sc;

//     // validate direction (straight or diagonal)
//     if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) {
//       setStatusMsg("Invalid selection");
//       setSelectStart(null);
//       setSelectEnd(null);
//       return;
//     }

//     const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
//     const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
//     const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;

//     // build path
//     const path = [];
//     for (let i = 0; i < length; i++) {
//       const rr = sr + stepR * i;
//       const cc = sc + stepC * i;
//       path.push([rr, cc]);
//     }

//     const letters = path.map(([pr, pc]) => grid[pr][pc]).join("");
//     const reversed = letters.split("").reverse().join("");

//     // Only accept if length matches one of the target words and not already found
//     const match = WORDS.find(
//       (w) => w.length === length && (w === letters || w === reversed)
//     );

//     if (!match) {
//       setStatusMsg("No word matched");
//       setSelectStart(null);
//       setSelectEnd(null);
//       return;
//     }

//     if (foundWords.has(match)) {
//       setStatusMsg("Word already found");
//       setSelectStart(null);
//       setSelectEnd(null);
//       return;
//     }

//     // Mark as found
//     const newFound = new Set(foundWords);
//     newFound.add(match);
//     setFoundWords(newFound);

//     const newCells = new Set(foundCells);
//     path.forEach(([pr, pc]) => newCells.add(toKey(pr, pc)));
//     setFoundCells(newCells);

//     // Score +10
//     setScore((s) => s + POINTS_PER_WORD);
//     setStatusMsg(`Found ${match}! +${POINTS_PER_WORD}`);
//     setSelectStart(null);
//     setSelectEnd(null);
//   };

//   /* Submit to server when finished */
//   const submitScore = async (points) => {
//     try {
//       const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
//       const uuid = user?.uuid || user?.uniqueNo;
//       if (!uuid) return;

//       await axios.post(`${baseUrl}/api/asian-paint/score`, {
//         uuid,
//         game: "wordSearch",
//         day: dayKey,
//         points,
//       });
//       setSnack({ open: true, message: "Score submitted!" });
//     } catch (e) {
//       if (e?.response?.status === 409) {
//         setSnack({ open: true, message: "Already submitted" });
//         localStorage.setItem(KEYS.done, "true");
//         setAlreadySubmitted(true);
//       } else {
//         setSnack({ open: true, message: "Saved locally (offline)" });
//       }
//     }
//   };

//   useEffect(() => {
//     if (!serverLockChecked) return;
//     if (alreadySubmitted) return;
//     if (finished) {
//       localStorage.setItem(KEYS.done, "true");
//       // Clear state since it's done
//       localStorage.removeItem(KEYS.state);
//       submitScore(score);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [finished, serverLockChecked, alreadySubmitted]);

//   /* Render helpers */
//   const renderCell = (r, c) => {
//     const key = toKey(r, c);
//     const ch = grid[r][c];

//     const isFound = foundCells.has(key);
//     const isSelected =
//       selectStart && selectEnd && keyInLine(key, selectStart, selectEnd);

//     return (
//       <Button
//         key={key}
//         onMouseDown={() => onCellDown(r, c)}
//         onMouseUp={() => onCellUp(r, c)}
//         onTouchStart={() => onCellDown(r, c)}
//         onTouchEnd={() => onCellUp(r, c)}
//         variant={isFound ? "contained" : "outlined"}
//         color={isFound ? "success" : "inherit"}
//         disableRipple
//         sx={{
//           minWidth: 36,
//           width: { xs: 32, sm: 36, md: 40 },
//           height: { xs: 32, sm: 36, md: 40 },
//           p: 0,
//           m: 0.3,
//           fontWeight: 800,
//           lineHeight: 1,
//           textTransform: "none",
//         }}
//       >
//         {ch}
//       </Button>
//     );
//   };

//   function keyInLine(key, start, end) {
//     const [r, c] = fromKey(key);
//     const [sr, sc] = start;
//     const [er, ec] = end;
//     const dr = er - sr;
//     const dc = ec - sc;

//     if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return false;

//     const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
//     const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
//     const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;

//     for (let i = 0; i < length; i++) {
//       const rr = sr + stepR * i;
//       const cc = sc + stepC * i;
//       if (rr === r && cc === c) return true;
//     }
//     return false;
//   }

//   // Simple progress in header
//   const progressPct = (foundWords.size / WORDS.length) * 100;

//   // Show loader while server lock is checked
//   if (!serverLockChecked) {
//     return (
//       <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
//         <Typography>Checking attempt status…</Typography>
//       </Box>
//     );
//   }

//   return (
//     <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
//       <Grid container justifyContent="center" sx={{ mt: 4, px: "12px" }}>
//         <Grid item xs={12} md={10} lg={8}>
//           <Stack spacing={2} alignItems="stretch">
//             <Typography
//               sx={{
//                 fontSize: { xs: "16px", md: "18px" },
//                 fontWeight: { xs: 600, md: 800 },
//               }}
//               align="center"
//               color="primary"
//             >
//               {dayKey.toUpperCase()} – Word Search
//             </Typography>

//             <Paper elevation={3} sx={{ p: 2 }}>
//               <Stack
//                 direction={{ xs: "column", sm: "row" }}
//                 spacing={2}
//                 alignItems={{ xs: "stretch", sm: "center" }}
//                 justifyContent="space-between"
//               >
//                 <Chip
//                   label={
//                     <Typography fontWeight={700}>
//                       Score:{" "}
//                       <Typography
//                         component="span"
//                         color="primary.main"
//                         fontWeight={800}
//                       >
//                         {score}
//                       </Typography>{" "}
//                       / {totalPoints}
//                     </Typography>
//                   }
//                   variant="outlined"
//                 />
//                 <Typography fontWeight={700}>
//                   {POINTS_PER_WORD} points per word • {foundWords.size} /{" "}
//                   {WORDS.length} found
//                 </Typography>
//                 <Chip
//                   color={finished || alreadySubmitted ? "success" : "default"}
//                   variant="filled"
//                   label={
//                     alreadySubmitted
//                       ? "Already submitted"
//                       : finished
//                       ? "Completed"
//                       : "In progress"
//                   }
//                 />
//               </Stack>

//               <Box sx={{ mt: 2 }}>
//                 <LinearProgress
//                   variant="determinate"
//                   value={progressPct}
//                   sx={{ height: 8, borderRadius: 999 }}
//                 />
//               </Box>
//             </Paper>

//             <Card elevation={6}>
//               <CardHeader
//                 title={
//                   <Typography
//                     sx={{
//                       fontSize: { xs: "1rem", md: "1.2rem" },
//                       fontWeight: 700,
//                     }}
//                   >
//                     Find these words
//                   </Typography>
//                 }
//                 subheader={
//                   <Typography variant="body2">
//                     TEXTURES • BRUSHES • LONDON • BIGBEN • BUCKINGHAM
//                   </Typography>
//                 }
//               />
//               <CardContent>
//                 <Box
//                   sx={{
//                     display: "grid",
//                     gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(28px, 42px))`,
//                     justifyContent: "center",
//                     userSelect: "none",
//                   }}
//                 >
//                   {grid.map((row, r) =>
//                     row.map((_, c) => (
//                       <React.Fragment key={toKey(r, c)}>
//                         {renderCell(r, c)}
//                       </React.Fragment>
//                     ))
//                   )}
//                 </Box>

//                 <Box sx={{ mt: 2 }}>
//                   <Typography variant="body2" color="text.secondary">
//                     Tip: Tap/click a start cell, then tap/click the end cell in
//                     a straight line (↔, ↕, or diagonal).
//                   </Typography>
//                   {statusMsg && (
//                     <Typography variant="body2" sx={{ mt: 1 }}>
//                       {statusMsg}
//                     </Typography>
//                   )}
//                 </Box>

//                 {finished && (
//                   <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
//                     <Button variant="contained" onClick={() => navigate("/")}>
//                       Home
//                     </Button>
//                   </Stack>
//                 )}
//               </CardContent>
//             </Card>

//             <Card elevation={6}>
//               <CardContent>
//                 <Typography variant="subtitle1" fontWeight={700} gutterBottom>
//                   Found words
//                 </Typography>
//                 <Stack direction="row" flexWrap="wrap" gap={1}>
//                   {WORDS.map((w) => (
//                     <Chip
//                       key={w}
//                       label={w}
//                       icon={
//                         foundWords.has(w) ? <CheckCircleIcon /> : <CancelIcon />
//                       }
//                       color={foundWords.has(w) ? "success" : "default"}
//                       variant={foundWords.has(w) ? "filled" : "outlined"}
//                     />
//                   ))}
//                 </Stack>
//               </CardContent>
//             </Card>
//           </Stack>
//         </Grid>
//       </Grid>

//       <Snackbar
//         open={snack.open}
//         autoHideDuration={1800}
//         onClose={() => setSnack((s) => ({ ...s, open: false }))}
//       >
//         <Alert variant="filled" severity="success" sx={{ width: "100%" }}>
//           {snack.message}
//         </Alert>
//       </Snackbar>
//     </Box>
//   );
// }
// src/pages/WordSearch/WordSearchMUI.jsx
// src/pages/WordSearch/WordSearchMUI.jsx
// src/pages/WordSearch/WordSearchMUI.jsx
// src/pages/WordSearch/WordSearchMUI.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import {
//   Box,
//   Card,
//   CardContent,
//   CardHeader,
//   Typography,
//   Button,
//   Stack,
//   Chip,
//   Grid,
//   Paper,
//   Alert,
//   Snackbar,
//   LinearProgress,
// } from "@mui/material";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import CancelIcon from "@mui/icons-material/Cancel";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import useGameSettings from "../../hooks/useGameSettings";

// /* ==============================
//    CONFIG
//    ============================== */
// const POINTS_PER_WORD = 10;
// // 9×9 grid
// const GRID_SIZE = 9;
// const GRID_GAP = 4;

// // Mobile responsiveness (370px minimum reference)
// const MIN_REF_WIDTH = 370;
// const MAX_REF_WIDTH = 760;
// const CELL_MIN = 26;
// const CELL_MAX = 48;

// // API base
// const baseUrl =
//   import.meta.env.VITE_APP_ENV === "local"
//     ? "http://localhost:7000"
//     : "https://api.nivabupalaunchevent.com";

// // Target words (BUCKINGHAM removed to fit 9×9)
// const WORDS = ["TEXTURES", "BRUSHES", "LONDON", "BIGBEN"];

// /* ==============================
//    Utils
//    ============================== */
// const toKey = (r, c) => `${r},${c}`;

// // seeded RNG (stable grid per day)
// function mulberry32(seed) {
//   return function () {
//     let t = (seed += 0x6d2b79f5);
//     t = Math.imul(t ^ (t >>> 15), t | 1);
//     t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
//     return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
//   };
// }
// function hashString(str) {
//   let h = 2166136261;
//   for (let i = 0; i < str.length; i++) {
//     h ^= str.charCodeAt(i);
//     h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
//   }
//   return h >>> 0;
// }

// /* ==============================
//    Placements for 9×9 (no overlaps)
//    ============================== */
// const placements = [
//   // TEXTURES (8): ↘ from (0,0) → (7,7)
//   { word: "TEXTURES", start: [0, 0], dir: [1, 1] },
//   // BRUSHES (7): ↓ from (0,8) → (6,8)
//   { word: "BRUSHES", start: [0, 8], dir: [1, 0] },
//   // LONDON (6): → from (8,0) → (8,5)
//   { word: "LONDON", start: [8, 0], dir: [0, 1] },
//   // BIGBEN (6): → from (6,0) → (6,5)  (moved to avoid conflicts)
//   { word: "BIGBEN", start: [6, 0], dir: [0, 1] },
// ];

// function buildGrid(seedString = "default") {
//   const grid = Array.from({ length: GRID_SIZE }, () =>
//     Array.from({ length: GRID_SIZE }, () => "")
//   );

//   // Place words
//   placements.forEach(({ word, start, dir }) => {
//     const [sr, sc] = start;
//     const [dr, dc] = dir;
//     for (let i = 0; i < word.length; i++) {
//       const r = sr + dr * i;
//       const c = sc + dc * i;
//       if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) {
//         throw new Error(`Word ${word} goes out of bounds`);
//       }
//       const existing = grid[r][c];
//       if (existing && existing !== word[i]) {
//         throw new Error(`Conflict placing ${word} at ${r},${c}`);
//       }
//       grid[r][c] = word[i];
//     }
//   });

//   // Fill blanks with seeded random A–Z
//   const rng = mulberry32(hashString(seedString));
//   const A = "A".charCodeAt(0);
//   for (let r = 0; r < GRID_SIZE; r++) {
//     for (let c = 0; c < GRID_SIZE; c++) {
//       if (!grid[r][c]) {
//         const ch = String.fromCharCode(A + Math.floor(rng() * 26));
//         grid[r][c] = ch;
//       }
//     }
//   }
//   return grid;
// }

// /* ==============================
//    Component
//    ============================== */
// export default function WordSearchMUI() {
//   const navigate = useNavigate();

//   // Active day from settings (same behavior as Quiz)
//   const gs = useGameSettings() || {};
//   const rawFromSettings =
//     gs.activeDay ||
//     gs.day ||
//     gs.currentDay ||
//     gs.gameDay ||
//     gs.settings?.activeDay ||
//     gs.settings?.day ||
//     "day1";

//   const dayKey = useMemo(() => {
//     const v = String(rawFromSettings).toLowerCase();
//     return ["day1", "day2", "day3"].includes(v) ? v : "day1";
//   }, [rawFromSettings]);

//   // Keys per day (v3 to invalidate previous caches)
//   const KEYS = useMemo(
//     () => ({
//       user: "ap_user",
//       state: `ap_ws_state_${dayKey}_v3`,
//       done: `ap_ws_completed_${dayKey}_v3`,
//       grid: `ap_ws_grid_${dayKey}_v3`,
//     }),
//     [dayKey]
//   );

//   // Server lock (hard lock even if localStorage cleared)
//   const [serverLockChecked, setServerLockChecked] = useState(false);
//   const [alreadySubmitted, setAlreadySubmitted] = useState(false);

//   // Responsive sizing
//   const wrapRef = useRef(null);
//   const gridRef = useRef(null); // for touchmove hit-testing
//   const [cellPx, setCellPx] = useState(32);
//   const [gridWidth, setGridWidth] = useState(MIN_REF_WIDTH);

//   const computeSizes = () => {
//     const containerWidth = wrapRef.current?.clientWidth || window.innerWidth;
//     const refWidth = Math.max(
//       MIN_REF_WIDTH,
//       Math.min(containerWidth, MAX_REF_WIDTH)
//     );
//     const totalGaps = GRID_GAP * (GRID_SIZE - 1);
//     const rawCell = Math.floor((refWidth - totalGaps) / GRID_SIZE);
//     const nextCell = Math.max(CELL_MIN, Math.min(CELL_MAX, rawCell));
//     const nextGridWidth = nextCell * GRID_SIZE + totalGaps;

//     setCellPx(nextCell);
//     setGridWidth(
//       Math.min(
//         nextGridWidth,
//         containerWidth >= MIN_REF_WIDTH ? refWidth : nextGridWidth
//       )
//     );
//   };

//   useEffect(() => {
//     computeSizes();
//     window.addEventListener("resize", computeSizes);
//     window.addEventListener("orientationchange", computeSizes);
//     return () => {
//       window.removeEventListener("resize", computeSizes);
//       window.removeEventListener("orientationchange", computeSizes);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Allow preventDefault on touchmove (needed to stop page scrolling while selecting)

//   // Game state
//   const [grid, setGrid] = useState(() => {
//     try {
//       const fromLS = localStorage.getItem(KEYS.grid);
//       if (fromLS) {
//         const parsed = JSON.parse(fromLS);
//         if (
//           Array.isArray(parsed) &&
//           parsed.length === GRID_SIZE &&
//           parsed[0].length === GRID_SIZE
//         ) {
//           return parsed;
//         }
//       }
//     } catch {}
//     const g = buildGrid(`ws-${dayKey}-9x9`);
//     localStorage.setItem(KEYS.grid, JSON.stringify(g));
//     return g;
//   });
//   const [foundWords, setFoundWords] = useState(() => new Set());
//   const [foundCells, setFoundCells] = useState(() => new Set());
//   const [score, setScore] = useState(0);

//   // Selection + live preview
//   const [isDragging, setIsDragging] = useState(false);
//   const [selectStart, setSelectStart] = useState(null); // [r,c] | null
//   const [selectEnd, setSelectEnd] = useState(null); // [r,c] | null
//   const usingTouchRef = useRef(false); // suppress click after touch

//   const [snack, setSnack] = useState({ open: false, message: "" });

//   const totalPoints = WORDS.length * POINTS_PER_WORD;
//   const finished = foundWords.size === WORDS.length;

//   /* ---------- SERVER LOCK CHECK ---------- */
//   useEffect(() => {
//     const node = gridRef.current;
//     if (!node) return;

//     const onNativeTouchMove = (ev) => {
//       if (!isDragging) return;
//       if (ev.cancelable) ev.preventDefault(); // stop page scroll
//       const t = ev.touches?.[0];
//       if (!t) return;

//       const cell = getCellFromPoint(t.clientX, t.clientY);
//       if (cell) setSelectEnd(cell);
//     };

//     node.addEventListener("touchmove", onNativeTouchMove, { passive: false });
//     return () => node.removeEventListener("touchmove", onNativeTouchMove);
//   }, [isDragging]);

//   useEffect(() => {
//     (async () => {
//       try {
//         const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
//         const uuid = user?.uuid || user?.uniqueNo;
//         if (!uuid) {
//           setAlreadySubmitted(false);
//           setServerLockChecked(true);
//           return;
//         }
//         const { data } = await axios.get(
//           `${baseUrl}/api/asian-paint/score/status`,
//           {
//             params: { uuid, game: "wordSearch", day: dayKey },
//           }
//         );
//         if (data?.submitted) {
//           localStorage.setItem(KEYS.done, "true");
//           setAlreadySubmitted(true);
//           if (typeof data.points === "number") setScore(data.points);
//           // mark all found to show Finished state
//           setFoundWords(new Set(WORDS));
//           try {
//             const fromLS = localStorage.getItem(KEYS.grid);
//             if (fromLS) setGrid(JSON.parse(fromLS));
//           } catch {}
//         } else {
//           localStorage.removeItem(KEYS.done);
//           setAlreadySubmitted(false);
//         }
//       } catch {
//         const localDone = localStorage.getItem(KEYS.done) === "true";
//         setAlreadySubmitted(localDone);
//         if (localDone) {
//           setFoundWords(new Set(WORDS));
//           setScore(totalPoints);
//         }
//       } finally {
//         setServerLockChecked(true);
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [dayKey, KEYS.user, KEYS.done]);

//   /* ---------- LOAD LOCAL PROGRESS ---------- */
//   useEffect(() => {
//     if (!serverLockChecked || alreadySubmitted) return;
//     try {
//       const raw = localStorage.getItem(KEYS.state);
//       if (!raw) return;
//       const saved = JSON.parse(raw);
//       if (Array.isArray(saved.foundWords))
//         setFoundWords(new Set(saved.foundWords));
//       if (Array.isArray(saved.foundCells))
//         setFoundCells(new Set(saved.foundCells));
//       if (typeof saved.score === "number") setScore(saved.score);
//     } catch {}
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [serverLockChecked, alreadySubmitted, KEYS.state]);

//   /* ---------- PERSIST PROGRESS ---------- */
//   useEffect(() => {
//     if (!serverLockChecked || alreadySubmitted) return;
//     const payload = {
//       foundWords: Array.from(foundWords),
//       foundCells: Array.from(foundCells),
//       score,
//     };
//     localStorage.setItem(KEYS.state, JSON.stringify(payload));
//   }, [
//     foundWords,
//     foundCells,
//     score,
//     alreadySubmitted,
//     serverLockChecked,
//     KEYS.state,
//   ]);

//   /* ---------- Selection helpers ---------- */
//   const alignedPath = (sr, sc, er, ec) => {
//     const dr = er - sr;
//     const dc = ec - sc;
//     if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null; // only straight/diag
//     const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
//     const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
//     const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
//     const path = [];
//     for (let i = 0; i < length; i++)
//       path.push([sr + stepR * i, sc + stepC * i]);
//     return path;
//   };
//   // Find the cell <Button> regardless of which child was hit
//   function getCellFromPoint(x, y) {
//     const el = document.elementFromPoint(x, y);
//     if (!el) return null;
//     // climb to the nearest element that has both data-r and data-c
//     const cell = el.closest ? el.closest("[data-r][data-c]") : el;
//     const rAttr = cell?.getAttribute?.("data-r");
//     const cAttr = cell?.getAttribute?.("data-c");
//     if (rAttr == null || cAttr == null) return null;
//     return [Number(rAttr), Number(cAttr)];
//   }

//   const previewKeys = useMemo(() => {
//     if (!isDragging || !selectStart || !selectEnd) return new Set();
//     const [sr, sc] = selectStart;
//     const [er, ec] = selectEnd;
//     const path = alignedPath(sr, sc, er, ec);
//     if (!path) return new Set();
//     return new Set(path.map(([r, c]) => toKey(r, c)));
//   }, [isDragging, selectStart, selectEnd]);

//   const finalizeSelection = (r, c) => {
//     if (!selectStart) return;
//     const [sr, sc] = selectStart;
//     const path = alignedPath(sr, sc, r, c);
//     setIsDragging(false);
//     setSelectStart(null);
//     setSelectEnd(null);
//     if (!path) return; // silently ignore invalid shapes

//     const letters = path.map(([pr, pc]) => grid[pr][pc]).join("");
//     const reversed = letters.split("").reverse().join("");
//     const match = WORDS.find(
//       (w) => w.length === path.length && (w === letters || w === reversed)
//     );
//     if (!match || foundWords.has(match)) return; // silently ignore non-matches/repeats

//     // Mark as found
//     const newFound = new Set(foundWords);
//     newFound.add(match);
//     setFoundWords(newFound);

//     const newCells = new Set(foundCells);
//     path.forEach(([pr, pc]) => newCells.add(toKey(pr, pc)));
//     setFoundCells(newCells);

//     // Score +10 and subtle success toast
//     setScore((s) => s + POINTS_PER_WORD);
//     setSnack({ open: true, message: `Found ${match}! +${POINTS_PER_WORD}` });
//   };

//   /* ---------- Desktop pointer (kept) ---------- */
//   const onPointerDown = (r, c) => {
//     if (usingTouchRef.current) return;
//     if (!serverLockChecked || alreadySubmitted || finished) return;
//     setIsDragging(true);
//     setSelectStart([r, c]);
//     setSelectEnd([r, c]);
//   };
//   const onPointerEnter = (r, c) => {
//     if (usingTouchRef.current) return;
//     if (!isDragging) return;
//     setSelectEnd([r, c]);
//   };
//   const onPointerUp = (r, c) => {
//     if (usingTouchRef.current) return;
//     if (!serverLockChecked || alreadySubmitted || finished) {
//       setIsDragging(false);
//       setSelectStart(null);
//       setSelectEnd(null);
//       return;
//     }
//     finalizeSelection(r, c);
//   };

//   /* ---------- Mobile touch (new) ---------- */
//   const onTouchStartCell = (r, c) => {
//     if (!serverLockChecked || alreadySubmitted || finished) return;
//     usingTouchRef.current = true;
//     setIsDragging(true);
//     setSelectStart([r, c]);
//     setSelectEnd([r, c]);
//   };

//   const onTouchMoveGrid = (e) => {
//     if (!isDragging) return;
//     // Keep the finger from scrolling while selecting
//     e.preventDefault();
//     const t = e.touches?.[0];
//     if (!t) return;
//     const el = document.elementFromPoint(t.clientX, t.clientY);
//     if (!el) return;
//     const r = el.getAttribute?.("data-r");
//     const c = el.getAttribute?.("data-c");
//     if (r !== null && c !== null) {
//       setSelectEnd([Number(r), Number(c)]);
//     }
//   };

//   const onTouchEndGrid = () => {
//     if (!isDragging) return;
//     setIsDragging(false);
//     if (selectStart && selectEnd) {
//       finalizeSelection(selectEnd[0], selectEnd[1]);
//     } else {
//       setSelectStart(null);
//       setSelectEnd(null);
//     }
//     // Let clicks work again shortly after touch
//     setTimeout(() => (usingTouchRef.current = false), 80);
//   };

//   /* ---------- Tap–tap fallback (works great on mobile) ---------- */
//   const onCellClick = (r, c) => {
//     // Suppress synthetic click after touch
//     if (usingTouchRef.current) return;
//     if (!serverLockChecked || alreadySubmitted || finished) return;
//     if (!selectStart) {
//       setSelectStart([r, c]);
//       setSelectEnd([r, c]);
//       return;
//     }
//     finalizeSelection(r, c);
//   };

//   /* ---------- Submit on finish ---------- */
//   const submitScore = async (points) => {
//     try {
//       const user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
//       const uuid = user?.uuid || user?.uniqueNo;
//       if (!uuid) return;
//       await axios.post(`${baseUrl}/api/asian-paint/score`, {
//         uuid,
//         game: "wordSearch",
//         day: dayKey,
//         points,
//       });
//       setSnack({ open: true, message: "Score submitted!" });
//     } catch (e) {
//       if (e?.response?.status === 409) {
//         setSnack({ open: true, message: "Already submitted" });
//         localStorage.setItem(KEYS.done, "true");
//         setAlreadySubmitted(true);
//       } else {
//         setSnack({ open: true, message: "Saved locally (offline)" });
//       }
//     }
//   };

//   useEffect(() => {
//     if (!serverLockChecked || alreadySubmitted) return;
//     if (finished) {
//       localStorage.setItem(KEYS.done, "true");
//       localStorage.removeItem(KEYS.state);
//       submitScore(score);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [finished, serverLockChecked, alreadySubmitted]);

//   // Loader while checking server
//   if (!serverLockChecked) {
//     return (
//       <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
//         <Typography>Checking attempt status…</Typography>
//       </Box>
//     );
//   }

//   const progressPct = (foundWords.size / WORDS.length) * 100;

//   return (
//     <Box
//       sx={{
//         minHeight: "100vh",
//         bgcolor: "background.default",
//         py: { xs: 2, md: 4 },
//       }}
//     >
//       <Grid
//         container
//         justifyContent="center"
//         sx={{ mt: { xs: 1, md: 2 }, px: "12px" }}
//       >
//         <Grid item xs={12} md={10} lg={8}>
//           <Stack spacing={2} alignItems="stretch">
//             <Typography
//               sx={{
//                 fontSize: { xs: "16px", md: "18px" },
//                 fontWeight: { xs: 600, md: 800 },
//               }}
//               align="center"
//               color="primary"
//             >
//               {dayKey.toUpperCase()} – Word Search
//             </Typography>

//             <Paper elevation={3} sx={{ p: { xs: 1.5, md: 2 } }}>
//               <Stack
//                 direction={{ xs: "column", sm: "row" }}
//                 spacing={2}
//                 alignItems={{ xs: "stretch", sm: "center" }}
//                 justifyContent="space-between"
//               >
//                 <Chip
//                   label={
//                     <Typography fontWeight={700}>
//                       Score:{" "}
//                       <Typography
//                         component="span"
//                         color="primary.main"
//                         fontWeight={800}
//                       >
//                         {score}
//                       </Typography>{" "}
//                       / {WORDS.length * POINTS_PER_WORD}
//                     </Typography>
//                   }
//                   variant="outlined"
//                 />
//                 <Typography fontWeight={700}>
//                   {POINTS_PER_WORD} points per word • {foundWords.size} /{" "}
//                   {WORDS.length} found
//                 </Typography>
//                 <Chip
//                   color={finished || alreadySubmitted ? "success" : "default"}
//                   variant="filled"
//                   label={
//                     alreadySubmitted
//                       ? "Already submitted"
//                       : finished
//                       ? "Completed"
//                       : "In progress"
//                   }
//                 />
//               </Stack>

//               <Box sx={{ mt: 2 }}>
//                 <LinearProgress
//                   variant="determinate"
//                   value={progressPct}
//                   sx={{ height: 8, borderRadius: 999 }}
//                 />
//               </Box>
//             </Paper>

//             <Card elevation={6}>
//               <CardContent>
//                 <Typography variant="subtitle1" fontWeight={700} gutterBottom>
//                   Found words
//                 </Typography>
//                 <Stack
//                   direction="row"
//                   flexWrap="wrap"
//                   gap={1}
//                   sx={{ justifyContent: { xs: "center", sm: "flex-start" } }}
//                 >
//                   {["TEXTURES", "BRUSHES", "LONDON", "BIGBEN"].map((w) => (
//                     <Chip
//                       key={w}
//                       label={w}
//                       icon={
//                         foundWords.has(w) ? <CheckCircleIcon /> : <CancelIcon />
//                       }
//                       color={foundWords.has(w) ? "success" : "default"}
//                       variant={foundWords.has(w) ? "filled" : "outlined"}
//                       sx={{ fontSize: { xs: 12, md: 14 } }}
//                     />
//                   ))}
//                 </Stack>
//               </CardContent>

//               <CardContent>
//                 {/* Wrap provides horizontal scroll if viewport < 370px */}
//                 <Box
//                   ref={wrapRef}
//                   sx={{
//                     width: "100%",
//                     overflowX: "auto",
//                     display: "flex",
//                     justifyContent: "center",
//                   }}
//                 >
//                   {/* Grid: enable touch selection + live preview */}
//                   <Box
//                     ref={gridRef}
//                     onTouchEnd={onTouchEndGrid}
//                     sx={{
//                       width: `${gridWidth}px`,
//                       display: "grid",
//                       gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellPx}px)`,
//                       gap: `${GRID_GAP}px`,
//                       justifyContent: "center",
//                       userSelect: "none",
//                       touchAction: "none",
//                       overscrollBehavior: "contain",
//                       px: 0.5,
//                       py: 0.5,
//                     }}
//                   >
//                     {grid.map((row, r) =>
//                       row.map((ch, c) => {
//                         const key = toKey(r, c);
//                         const isFound = foundCells.has(key);
//                         const isPreview = previewKeys.has(key) && !isFound;
//                         return (
//                           <Button
//                             key={key}
//                             data-r={r}
//                             data-c={c}
//                             // Desktop pointer
//                             onPointerDown={() => onPointerDown(r, c)}
//                             onPointerEnter={() => onPointerEnter(r, c)}
//                             onPointerUp={() => onPointerUp(r, c)}
//                             // Mobile touch (start on the cell)
//                             onTouchStart={() => onTouchStartCell(r, c)}
//                             // Tap–tap fallback
//                             onClick={() => onCellClick(r, c)}
//                             variant={
//                               isFound
//                                 ? "contained"
//                                 : isPreview
//                                 ? "contained"
//                                 : "outlined"
//                             }
//                             color={
//                               isFound
//                                 ? "success"
//                                 : isPreview
//                                 ? "primary"
//                                 : "inherit"
//                             }
//                             disableRipple
//                             sx={{
//                               width: `${cellPx}px`,
//                               height: `${cellPx}px`,
//                               minWidth: `${cellPx}px`,
//                               p: 0,
//                               m: 0,
//                               cursor: "pointer",
//                               fontWeight: 800,
//                               lineHeight: 1,
//                               fontSize: { xs: 14, sm: 16 },
//                               textTransform: "none",
//                             }}
//                           >
//                             {ch}
//                           </Button>
//                         );
//                       })
//                     )}
//                   </Box>
//                 </Box>

//                 {finished && (
//                   <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
//                     <Button variant="contained" onClick={() => navigate("/")}>
//                       Home
//                     </Button>
//                   </Stack>
//                 )}
//               </CardContent>
//             </Card>
//           </Stack>
//         </Grid>
//       </Grid>

//       <Snackbar
//         open={snack.open}
//         autoHideDuration={1400}
//         onClose={() => setSnack((s) => ({ ...s, open: false }))}
//       >
//         <Alert variant="filled" severity="success" sx={{ width: "100%" }}>
//           {snack.message}
//         </Alert>
//       </Snackbar>
//     </Box>
//   );
// }
// src/pages/WordSearch/WordSearchMUI.jsx
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

/* ==============================
   CONFIG
   ============================== */
const POINTS_PER_WORD = 10;
// 9×9 grid
const GRID_SIZE = 9;
const GRID_GAP = 4;

// Mobile responsiveness (370px minimum reference)
const MIN_REF_WIDTH = 370;
const MAX_REF_WIDTH = 760;
const CELL_MIN = 26;
const CELL_MAX = 48;

// API base
const baseUrl =
  import.meta.env.VITE_APP_ENV === "local"
    ? "http://localhost:7000"
    : "https://api.nivabupalaunchevent.com";

// Target words (BUCKINGHAM removed to fit 9×9)
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
   Placements for 9×9 (no overlaps)
   ============================== */
const placements = [
  // TEXTURES (8): ↘ from (0,0) → (7,7)
  { word: "TEXTURES", start: [0, 0], dir: [1, 1] },
  // BRUSHES (7): ↓ from (0,8) → (6,8)
  { word: "BRUSHES", start: [0, 8], dir: [1, 0] },
  // LONDON (6): → from (8,0) → (8,5)
  { word: "LONDON", start: [8, 0], dir: [0, 1] },
  // BIGBEN (6): → from (6,0) → (6,5)
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

  // Fill blanks with seeded random A–Z
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
    const refWidth = Math.max(
      MIN_REF_WIDTH,
      Math.min(containerWidth, MAX_REF_WIDTH)
    );
    const totalGaps = GRID_GAP * (GRID_SIZE - 1);
    const rawCell = Math.floor((refWidth - totalGaps) / GRID_SIZE);
    const nextCell = Math.max(CELL_MIN, Math.min(CELL_MAX, rawCell));
    const nextGridWidth = nextCell * GRID_SIZE + totalGaps;

    setCellPx(nextCell);
    setGridWidth(
      Math.min(
        nextGridWidth,
        containerWidth >= MIN_REF_WIDTH ? refWidth : nextGridWidth
      )
    );
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

  /* ---------- Native touchmove (passive:false) ---------- */
  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;

    const onNativeTouchMove = (ev) => {
      if (!isDragging) return;
      if (ev.cancelable) ev.preventDefault(); // stop scroll while selecting
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
      // silent on success to avoid spamming snackbars
    } catch (e) {
      // ignore transient errors; final submit will re-send
      if (e?.response?.status === 409) {
        // Server indicates it's already locked; enforce lock
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

  /* ---------- Tap–tap fallback ---------- */
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

    // +10 points, and immediately update DB with the NEW total
    setScore((prev) => {
      const next = prev + POINTS_PER_WORD;
      upsertScore(next); // <-- per-word day score update
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
        <Typography>Checking attempt status…</Typography>
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
              {dayKey.toUpperCase()} – Word Search
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
                  {POINTS_PER_WORD} points per word • {foundWords.size} /{" "}
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
                    overflowX: "auto",
                    display: "flex",
                    justifyContent: "center",
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
                      touchAction: "none", // important for mobile drag
                      overscrollBehavior: "contain", // avoid rubber-banding while dragging
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
                            // Mobile touch (start on the cell)
                            onTouchStart={() => onTouchStartCell(r, c)}
                            // Tap–tap fallback
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
