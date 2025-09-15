// src/components/admin/ContentBrowser.jsx
import * as React from "react";
import {
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  Divider,
  Skeleton,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";
import { baseUrl } from "../constant/constant";

export default function ContentBrowser({
  adminKey,
  adminUuid,
  slotsPerDay: slotsPerDayProp,
}) {
  const [day, setDay] = React.useState(""); // empty = all
  const [game, setGame] = React.useState(""); // empty = all
  const [slot, setSlot] = React.useState(""); // empty = all
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [viewItem, setViewItem] = React.useState(null);
  const [slotsPerDay, setSlotsPerDay] = React.useState({
    day1: 1,
    day2: 1,
    day3: 1,
  });

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = adminUuid
        ? { "x-admin-uuid": adminUuid }
        : { "x-admin-key": adminKey };
      const params = {};
      if (day) params.day = day;
      if (game) params.game = game;
      if (slot !== "" && slot != null) params.slot = slot;
      const res = await axios.get(`${baseUrl}/api/admin/content/list`, {
        headers,
        params,
      });
      setItems(res.data?.items || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load content");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch slotsPerDay to populate Slot dropdown (unless provided by parent)
  const fetchSettings = React.useCallback(async () => {
    if (slotsPerDayProp) {
      setSlotsPerDay(slotsPerDayProp);
      return;
    }
    try {
      const res = await axios.get(`${baseUrl}/api/admin/public/settings`);
      const data = res.data || {};
      if (data.slotsPerDay) setSlotsPerDay(data.slotsPerDay);
    } catch {
      // leave defaults
    }
  }, [slotsPerDayProp]);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const renderSummary = (it) => {
    try {
      const p = it?.payload || {};
      if (it.game === "quiz") {
        const n = Array.isArray(p.questions) ? p.questions.length : 0;
        const t = p.timerSeconds ?? p.timeLimit;
        return `Q: ${n}${t ? `, T: ${t}s` : ""}`;
      }
      if (it.game === "wordSearch") {
        const n = Array.isArray(p.words) ? p.words.length : 0;
        const ppw = p.pointsPerWord ?? p.points_per_word;
        return `Words: ${n}${ppw ? `, +${ppw}/word` : ""}`;
      }
      if (it.game === "jigsaw") {
        const ppt = p.pointsPerTile;
        const t = p.timerSeconds ?? p.timeLimit;
        const img = p.imageUrl
          ? p.imageUrl.length > 28
            ? p.imageUrl.slice(0, 28) + "…"
            : p.imageUrl
          : "";
        return `${img}${ppt ? `, +${ppt}/tile` : ""}${
          t ? `, T: ${t}s` : ""
        }`.trim();
      }
      if (it.game === "crossword") {
        return Object.keys(p || {}).join(", ") || "-";
      }
      return "-";
    } catch {
      return "-";
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={800}>
          Content Browser
        </Typography>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", md: "center" }}
          sx={{ flexWrap: "wrap" }}
        >
          <TextField
            select
            size="small"
            label="Day"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="day1">Day 1</MenuItem>
            <MenuItem value="day2">Day 2</MenuItem>
            <MenuItem value="day3">Day 3</MenuItem>
            <MenuItem value="day4">Day 4</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Game"
            value={game}
            onChange={(e) => setGame(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="quiz">Quiz</MenuItem>
            <MenuItem value="wordSearch">Word Search</MenuItem>
            <MenuItem value="jigsaw">Jigsaw</MenuItem>
            <MenuItem value="crossword">Crossword</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Slot"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            sx={{ minWidth: 120 }}
            disabled={!day}
          >
            <MenuItem value="">All</MenuItem>
            {day &&
              Array.from(
                { length: slotsPerDay[day] || 1 },
                (_, i) => i + 1
              ).map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
          </TextField>
          <Button
            variant="contained"
            onClick={async () => {
              await fetchSettings();
              fetchList();
            }}
          >
            Fetch
          </Button>
        </Stack>
        {error && <Typography color="error">{error}</Typography>}
        <Divider />

        {loading ? (
          <Stack spacing={1}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={52} />
            ))}
          </Stack>
        ) : items.length === 0 ? (
          <Typography color="text.secondary">No content found.</Typography>
        ) : (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxWidth: "100%", overflowX: "auto" }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Day</TableCell>
                  <TableCell>Slot</TableCell>
                  <TableCell>Game</TableCell>
                  <TableCell>Group</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Summary</TableCell>
                  <TableCell align="right">View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it._id} hover>
                    <TableCell>{String(it.day).toUpperCase()}</TableCell>
                    <TableCell>{it.slot ?? "—"}</TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {it.game}
                    </TableCell>
                    <TableCell>{it.groupKey ?? "general"}</TableCell>
                    <TableCell>{it.version}</TableCell>
                    <TableCell>
                      {new Date(it.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{renderSummary(it)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => setViewItem(it)}
                        aria-label="View payload"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
      <Dialog
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Content Payload</DialogTitle>
        <DialogContent dividers>
          {viewItem?.game === "quiz" &&
          Array.isArray(viewItem?.payload?.questions) ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Question</TableCell>
                  <TableCell>A</TableCell>
                  <TableCell>B</TableCell>
                  <TableCell>C</TableCell>
                  <TableCell>D</TableCell>
                  <TableCell>Correct</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {viewItem.payload.questions.map((q, i) => (
                  <TableRow key={q.id ?? i}>
                    <TableCell>{q.id ?? i + 1}</TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 360,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {q.question}
                    </TableCell>
                    <TableCell>{q.options?.[0]}</TableCell>
                    <TableCell>{q.options?.[1]}</TableCell>
                    <TableCell>{q.options?.[2]}</TableCell>
                    <TableCell>{q.options?.[3]}</TableCell>
                    <TableCell>
                      {typeof q.correctIndex === "number"
                        ? String.fromCharCode(65 + q.correctIndex)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : viewItem?.game === "wordSearch" ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2">Words</Typography>
                <Table size="small">
                  <TableBody>
                    {(viewItem.payload?.words || []).map((w, i) => (
                      <TableRow key={i}>
                        <TableCell>{w}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Box>
                <Typography variant="subtitle2">Placements</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Word</TableCell>
                      <TableCell>Start [r,c]</TableCell>
                      <TableCell>Dir [dr,dc]</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(viewItem.payload?.placements || []).map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>{p.word}</TableCell>
                        <TableCell>
                          {Array.isArray(p.start)
                            ? `[${p.start.join(",")}]`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {Array.isArray(p.dir) ? `[${p.dir.join(",")}]` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          ) : viewItem?.game === "jigsaw" ? (
            <Stack spacing={1}>
              {viewItem.payload?.imageUrl && (
                <Box
                  component="img"
                  src={viewItem.payload.imageUrl}
                  alt="Jigsaw"
                  sx={{ maxWidth: "100%", borderRadius: 1 }}
                />
              )}
              <Typography variant="body2">
                Points per tile: {viewItem.payload?.pointsPerTile ?? "-"}
              </Typography>
              <Typography variant="body2">
                Timer (s):{" "}
                {viewItem.payload?.timerSeconds ??
                  viewItem.payload?.timeLimit ??
                  "-"}
              </Typography>
            </Stack>
          ) : (
            <Box
              sx={{
                fontFamily: "monospace",
                fontSize: 12,
                whiteSpace: "pre-wrap",
              }}
            >
              {viewItem ? JSON.stringify(viewItem.payload, null, 2) : ""}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
