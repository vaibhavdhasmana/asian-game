import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  LinearProgress,
} from "@mui/material";
import { baseUrl } from "../constant/constant";

// Utils
const pad2 = (n) => String(n).padStart(2, "0");

export default function WordSearchUpload({ open, onClose }) {
  const [adminKey, setAdminKey] = useState(
    import.meta.env.VITE_ADMIN_KEY || ""
  );

  const [currentDay, setCurrentDay] = useState("day1");
  const [day, setDay] = useState("day1");
  const [groupsColors, setGroupsColors] = useState({ day2: [], day3: [] });
  const [color, setColor] = useState("");
  const [index, setIndex] = useState(1); // for color-01 style
  const [numberedGroups, setNumberedGroups] = useState(false); // auto-detected
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "info", text: "" });
  const [activeKeys, setActiveKeys] = useState([]);

  // Load public settings → currentDay + allowed colors
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/admin/public/settings`);
        const data = await res.json();
        const cd = data?.currentDay || "day1";
        setCurrentDay(cd);
        setDay(cd);
        setGroupsColors({
          day2: (data?.groupsColors?.day2 || []).map(String),
          day3: (data?.groupsColors?.day3 || []).map(String),
        });
      } catch (e) {
        setMsg({ type: "error", text: "Failed to load settings" });
      }
    })();
  }, []);

  // Peek active keys for the selected day to detect scheme (color vs color-##)
  useEffect(() => {
    if (!adminKey || !day) return;
    (async () => {
      try {
        const url = new URL(`${baseUrl}/api/admin/content/status`);
        url.searchParams.set("day", day);
        const res = await fetch(url, { headers: { "x-admin-key": adminKey } });
        if (!res.ok) throw new Error("status failed");
        const data = await res.json();
        const keys = Object.keys(data?.active || {});
        setActiveKeys(keys);
        // Detect if keys look like "...purple-01"
        const hasNumbered = keys.some((k) =>
          /day[23]\.wordSearch\.[a-z]+-\d{2}/i.test(k)
        );
        setNumberedGroups(hasNumbered);
      } catch (_) {
        // not fatal — maybe no content yet
        setActiveKeys([]);
        setNumberedGroups(false);
      }
    })();
  }, [adminKey, day]);

  // Available colors for the selected day
  const colorsForDay = useMemo(() => {
    if (day === "day2") return groupsColors.day2 || [];
    if (day === "day3") return groupsColors.day3 || [];
    return [];
  }, [day, groupsColors]);

  // Compute final groupKey (if needed)
  const groupKey = useMemo(() => {
    if (day === "day1") return "default";
    if (!color) return "";
    return numberedGroups ? `${color}-${pad2(index)}` : color;
  }, [day, color, index, numberedGroups]);

  // Persist admin key locally
  const saveAdminKey = () => localStorage.setItem("ap_admin_key", adminKey);

  const onFile = (e) => setFile(e.target.files?.[0] || null);

  const downloadSample = () => {
    const sample = [
      "grid,words",
      "A S I A N P A I N T S|R E A C T J A V A S C|O B J E C T I V E C|U T I L I T I E S S|N D E S I G N P A T|T S C R I P T H T M|  C S S F L E X B O|  O X B O X L A Y O|  U T L A Y E R S,ASIAN:0:0:5:across|PAINTS:0:6:6:across|REACT:1:0:5:across|JAVASCRIPT:1:6:9:across|OBJECTIVE:2:0:9:across|C:2:9:1:down|UTILITIES:3:0:9:across|DESIGN:4:2:6:across|PATTERN:4:8:6:across|TYPESCRIPT:5:0:9:across|HTML:5:8:4:across|CSS:6:2:3:across|FLEXBOX:6:6:7:across|BOX:7:4:3:across|LAYOUT:7:7:6:across|LAYER:8:3:5:across|S:8:8:1:down",
      "P A I N T B R U S H|E X T E R I O R W A|L L S U R F A C E S|I N T E R I O R D E|C O R A T I O N S,PAINT:0:0:5:across|BRUSH:0:6:5:across|EXTERIOR:1:0:8:across|WALL:1:9:4:across|SURFACES:2:0:8:across|INTERIOR:3:0:8:across|DECORATION:4:0:10:across|S:4:10:1:down",
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wordsearch-${day}.csv`;
    a.click();
  };

  const upload = async () => {
    if (!adminKey) return setMsg({ type: "error", text: "Admin key required" });
    if (!file)
      return setMsg({ type: "error", text: "Please choose a CSV file" });
    if (!day) return setMsg({ type: "error", text: "Select a day" });
    if (day !== "day1" && !color)
      return setMsg({ type: "error", text: "Select a color group" });

    try {
      setBusy(true);
      setMsg({ type: "info", text: "Uploading…" });
      const qs = new URLSearchParams({ day, game: "wordSearch" });
      if (day !== "day1") qs.set("group", groupKey);

      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(
        `${baseUrl}/api/admin/content/upload?${qs.toString()}`,
        {
          method: "POST",
          headers: { "x-admin-key": adminKey },
          body: fd,
        }
      );

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Upload failed");
      }
      const out = await res.json();
      setMsg({
        type: "success",
        text: `Uploaded v${out?.version || 1} → ${out?.key || ""}`,
      });
      // refresh status
      const url = new URL(`${baseUrl}/api/admin/content/status`);
      url.searchParams.set("day", day);
      const r2 = await fetch(url, { headers: { "x-admin-key": adminKey } });
      const j2 = await r2.json().catch(() => ({}));
      setActiveKeys(Object.keys(j2?.active || {}));
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload Word Search (Admin)</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">
            Upload word search puzzles in CSV format. Each row contains the grid
            and word definitions with positions.
          </Alert>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Admin Key (x-admin-key)"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onBlur={saveAdminKey}
              fullWidth
            />
            <TextField
              label="Server Current Day"
              value={currentDay.toUpperCase()}
              InputProps={{ readOnly: true }}
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Day</InputLabel>
              <Select
                value={day}
                label="Day"
                onChange={(e) => {
                  setDay(e.target.value);
                  setColor("");
                }}
              >
                <MenuItem value="day1">Day 1</MenuItem>
                <MenuItem value="day2">Day 2</MenuItem>
                <MenuItem value="day3">Day 3</MenuItem>
              </Select>
            </FormControl>

            {day !== "day1" && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Group Color</InputLabel>
                  <Select
                    value={color}
                    label="Group Color"
                    onChange={(e) => setColor(e.target.value)}
                  >
                    {colorsForDay.map((c) => (
                      <MenuItem key={c} value={String(c).toLowerCase()}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {day !== "day1" && numberedGroups && (
                  <FormControl fullWidth>
                    <InputLabel>Index</InputLabel>
                    <Select
                      value={index}
                      label="Index"
                      onChange={(e) => setIndex(Number(e.target.value))}
                    >
                      {Array.from({ length: 20 }).map((_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          {pad2(i + 1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </>
            )}
          </Stack>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button variant="outlined" onClick={downloadSample}>
                    Download sample CSV
                  </Button>
                  <Chip label="Columns: grid,words" />
                </Stack>
                <TextField
                  type="file"
                  inputProps={{ accept: ".csv,text/csv" }}
                  onChange={onFile}
                  helperText={file ? file.name : "Choose your word search CSV"}
                />
                {busy && <LinearProgress />}
                {msg.text && <Alert severity={msg.type}>{msg.text}</Alert>}
              </Stack>
            </CardContent>
          </Card>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2">
              Active content keys for {day.toUpperCase()}:
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {activeKeys.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  None
                </Typography>
              ) : (
                activeKeys.map((k) => <Chip key={k} label={k} />)
              )}
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={upload} disabled={busy || !file}>
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}
