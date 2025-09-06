// CrosswordMUI.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Chip,
  Stack,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputBase,
} from "@mui/material";

// -------------------------------------------------------------
// London puzzle (6x6). Black cells are " " (space).
// NOTE: "TEA" moved to (row:2, col:3, len:3) to match the grid.
// -------------------------------------------------------------
const puzzles = [
  {
    id: "london",
    title: "London",
    gridSize: 6,
    solution: [
      ["T", "H", "A", "M", "E", "S"],
      ["O", " ", " ", " ", " ", "H"],
      ["W", "E", "S", "T", " ", "A"],
      ["E", " ", " ", "E", " ", "R"],
      ["R", "O", "Y", "A", "L", "D"],
      [" ", " ", " ", " ", " ", " "],
    ],
    clues: {
      across: [
        {
          clue: "London's River",
          answer: "THAMES",
          row: 0,
          col: 0,
          length: 6,
        },
        {
          clue: "End area with many theaters",
          answer: "WEST",
          row: 2,
          col: 0,
          length: 4,
        },
        {
          clue: "Albert Hall",
          answer: "ROYAL",
          row: 4,
          col: 0,
          length: 5,
        },
      ],
      down: [
        {
          clue: "Historic castle in London",
          answer: "TOWER",
          row: 0,
          col: 0,
          length: 5,
        },
        {
          clue: "Traditional afternoon drink",
          answer: "TEA",
          row: 2,
          col: 3,
          length: 3,
        },
        {
          clue: "Tallest building in London",
          answer: "SHARD",
          row: 0,
          col: 5,
          length: 5,
        },
      ],
    },
  },
];

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------
const isBlack = (puzzle, r, c) => puzzle.solution[r][c] === " ";

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
      if (isBlack(puzzle, r, c)) continue;

      const startsAcross =
        (c === 0 || isBlack(puzzle, r, c - 1)) &&
        c + 1 < N &&
        !isBlack(puzzle, r, c + 1);
      const startsDown =
        (r === 0 || isBlack(puzzle, r - 1, c)) &&
        r + 1 < N &&
        !isBlack(puzzle, r + 1, c);

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

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------
export default function CrosswordMUI({ initialPuzzleId = "london" }) {
  const [selectedId, setSelectedId] = useState(initialPuzzleId);

  const basePuzzle = useMemo(() => {
    const p = puzzles.find((x) => x.id === selectedId) || puzzles[0];
    return assignNumbers(p);
  }, [selectedId]);

  const [grid, setGrid] = useState(
    Array.from({ length: basePuzzle.gridSize }, () =>
      Array(basePuzzle.gridSize).fill("")
    )
  );
  const [score, setScore] = useState(0);
  const [solvedWords, setSolvedWords] = useState([]);
  const [snack, setSnack] = useState({ open: false, message: "" });

  const inputRefs = useRef(
    Array.from({ length: basePuzzle.gridSize }, () =>
      Array(basePuzzle.gridSize).fill(null)
    )
  );

  // Keep where focus should be
  const lastFocusRef = useRef({ r: 0, c: 0 });

  // Reset when puzzle changes
  useEffect(() => {
    setGrid(
      Array.from({ length: basePuzzle.gridSize }, () =>
        Array(basePuzzle.gridSize).fill("")
      )
    );
    setScore(0);
    setSolvedWords([]);
    inputRefs.current = Array.from({ length: basePuzzle.gridSize }, () =>
      Array(basePuzzle.gridSize).fill(null)
    );
    lastFocusRef.current = { r: 0, c: 0 };
  }, [basePuzzle]);

  // Restore focus to the last intended cell after state updates
  useLayoutEffect(() => {
    const { r, c } = lastFocusRef.current || {};
    inputRefs.current[r]?.[c]?.focus?.();
  }, [grid]);

  const showSolved = (msg) => setSnack({ open: true, message: msg });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const markSolvedIfAny = (updatedGrid) => {
    const newly = [];

    // across
    basePuzzle.clues.across.forEach((clue) => {
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
    basePuzzle.clues.down.forEach((clue) => {
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
    const raw = e.target.value.slice(-1); // last char only
    const value = raw.toUpperCase().replace(/[^A-Z]/g, ""); // letters only

    // Decide next focus target before state update
    if (value) {
      let target = { r, c };
      // prefer right, then down
      for (let nc = c + 1; nc < basePuzzle.gridSize; nc++) {
        if (!isBlack(basePuzzle, r, nc)) {
          target = { r, c: nc };
          break;
        }
      }
      if (target.c === c) {
        for (let nr = r + 1; nr < basePuzzle.gridSize; nr++) {
          if (!isBlack(basePuzzle, nr, c)) {
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
    const N = basePuzzle.gridSize;

    if (e.key === "Backspace" && !grid[r][c]) {
      e.preventDefault();
      // previous focus (left, then up)
      let target = { r, c };
      for (let nc = c - 1; nc >= 0; nc--) {
        if (!isBlack(basePuzzle, r, nc)) {
          target = { r, c: nc };
          break;
        }
      }
      if (target.c === c) {
        for (let nr = r - 1; nr >= 0; nr--) {
          if (!isBlack(basePuzzle, nr, c)) {
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
        if (!isBlack(basePuzzle, r, nc)) {
          lastFocusRef.current = { r, c: nc };
          inputRefs.current[r][nc]?.focus();
          break;
        }
      }
    } else if (e.key === "ArrowLeft" && c > 0) {
      e.preventDefault();
      for (let nc = c - 1; nc >= 0; nc--) {
        if (!isBlack(basePuzzle, r, nc)) {
          lastFocusRef.current = { r, c: nc };
          inputRefs.current[r][nc]?.focus();
          break;
        }
      }
    } else if (e.key === "ArrowDown" && r < N - 1) {
      e.preventDefault();
      for (let nr = r + 1; nr < N; nr++) {
        if (!isBlack(basePuzzle, nr, c)) {
          lastFocusRef.current = { r: nr, c };
          inputRefs.current[nr][c]?.focus();
          break;
        }
      }
    } else if (e.key === "ArrowUp" && r > 0) {
      e.preventDefault();
      for (let nr = r - 1; nr >= 0; nr--) {
        if (!isBlack(basePuzzle, nr, c)) {
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
    setGrid(
      Array.from({ length: basePuzzle.gridSize }, () =>
        Array(basePuzzle.gridSize).fill("")
      )
    );
    setScore(0);
    setSolvedWords([]);
    lastFocusRef.current = { r: 0, c: 0 };
    // focus after paint
    setTimeout(() => inputRefs.current[0]?.[0]?.focus?.(), 0);
  };

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  const cellSize = "clamp(36px, 7.5vw, 56px)";

  const GridCell = React.memo(function GridCell({ r, c }) {
    const black = isBlack(basePuzzle, r, c);
    const n = getClueNumberAtCell(basePuzzle, r, c);

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
            value={grid[r][c] || ""}
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
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} md={10} lg={9}>
          <Stack spacing={2} alignItems="center">
            <Typography variant="h3" fontWeight={800} color="warning.main">
              {basePuzzle.title} Crossword
            </Typography>
            <Typography color="text.secondary">
              Solve the clues and test your knowledge!
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{ width: "100%", maxWidth: 1100 }}
            >
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="puzzle-select-label">Puzzle</InputLabel>
                <Select
                  labelId="puzzle-select-label"
                  label="Puzzle"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {puzzles.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

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
                <Button variant="contained" color="error" onClick={resetGame}>
                  Reset
                </Button>
              </Stack>
            </Stack>

            <Grid container spacing={3} sx={{ width: "100%", maxWidth: 1100 }}>
              {/* LEFT: Grid */}
              <Grid item xs={12} md={6}>
                <Paper elevation={6} sx={{ p: 1.5 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${basePuzzle.gridSize}, ${cellSize})`,
                      gridAutoRows: cellSize,
                    }}
                  >
                    {Array.from({ length: basePuzzle.gridSize }).map((_, r) =>
                      Array.from({ length: basePuzzle.gridSize }).map(
                        (__, c) => <GridCell key={`${r}-${c}`} r={r} c={c} />
                      )
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
                        {basePuzzle.clues.across.map((clue) => {
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
                        {basePuzzle.clues.down.map((clue) => {
                          const solved = solvedWords.includes(clue.answer);
                          return (
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
          </Stack>
        </Grid>
      </Grid>

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
