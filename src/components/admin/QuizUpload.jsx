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

// const baseUrl = import.meta.env.VITE_baseUrl || "";

// Utils
const pad2 = (n) => String(n).padStart(2, "0");

export default function QuizUpload({ open, onClose }) {
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
          /day[23]\.quiz\.[a-z]+-\d{2}/i.test(k)
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
    if (day === "day4") return groupsColors.day4 || [];
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
      "id,question,optionA,optionB,optionC,optionD,correct(A-D),points,time",
      "Q1,Which brand?,Asian Paints,Nerolac,Berger,Dulux,A,0,0",
      "Q2,Main product?,Paints,Cement,Steel,Glass,A,0,0",
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quiz-${day}.csv`;
    a.click();
  };

  const upload = async () => {
    if (!adminKey) return setMsg({ type: "error", text: "Admin key required" });
    if (!file)
      return setMsg({ type: "error", text: "Please choose a CSV file" });
    if (!day) return setMsg({ type: "error", text: "Select a day" });
    if ((day === "day2" || day === "day3" || day === "day4") && !color)
      return setMsg({ type: "error", text: "Select a color group" });

    try {
      setBusy(true);
      setMsg({ type: "info", text: "Uploading…" });
      const qs = new URLSearchParams({ day, game: "quiz" });
      if (day === "day2" || day === "day3" || day === "day4") qs.set("group", groupKey);

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
      <DialogTitle>Upload Quiz (Admin)</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">
            Day & allowed groups come from server settings. Save your Admin Key
            once — it’s sent in <code>x-admin-key</code> for protected routes.
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
                <MenuItem value="day4">Day 4</MenuItem>
              </Select>
            </FormControl>

            {(day === "day2" || day === "day3" || day === "day4") && (
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
                {/** If backend uses color-##, allow choosing an index */}
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
                  <Chip label="Columns: id,question,optionA,optionB,optionC,optionD,correct(A-D),points,time" />
                </Stack>
                <TextField
                  type="file"
                  inputProps={{ accept: ".csv,text/csv" }}
                  onChange={onFile}
                  helperText={file ? file.name : "Choose your quiz CSV"}
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
