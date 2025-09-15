// src/pages/Admin/AdminSettings.jsx
import * as React from "react";
import {
  Box,
  Container,
  Tabs,
  Tab,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Alert,
  Button,
  Grid,
} from "@mui/material";
import UploadCard from "../../components/admin/UploadCard";
import ContentBrowser from "../../components/admin/ContentBrowser";
import ServerSettingsViewer from "../../components/admin/ServerSettingsViewer";
import axios from "axios";
import { Alert as MuiAlert, Snackbar } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { baseUrl } from "../../components/constant/constant";

export default function AdminSettings() {
  const { user } = useAuth();
  const [tab, setTab] = React.useState("day1");
  const adminKey = import.meta.env.VITE_ADMIN_KEY || ""; // dev only
  console.log("adminKey", adminKey);
  const [currentDay, setCurrentDay] = React.useState("day1");
  const [currentSlot, setCurrentSlot] = React.useState(1);
  const [slotsPerDay, setSlotsPerDay] = React.useState({
    day1: 1,
    day2: 1,
    day3: 1,
  });
  const [slotsDraft, setSlotsDraft] = React.useState("");
  const [snack, setSnack] = React.useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [refreshTick, setRefreshTick] = React.useState(0);

  React.useEffect(() => {
    const headers =
      user?.isAdmin && user?.uuid
        ? { "x-admin-uuid": user.uuid }
        : { "x-admin-key": adminKey };
    axios.get(`${baseUrl}/api/admin/settings`, { headers }).then((res) => {
      setCurrentDay(res.data?.currentDay || "day1");
      setCurrentSlot(res.data?.currentSlot || 1);
      setSlotsPerDay(res.data?.slotsPerDay || { day1: 1, day2: 1, day3: 1 });
      const spd = res.data?.slotsPerDay || { day1: 1, day2: 1, day3: 1 };
      setSlotsDraft(String(spd[tab] ?? ""));
    });
  }, [adminKey, user]);

  // Keep draft in sync when switching tabs or when server state changes
  React.useEffect(() => {
    // Keep draft synced to the currently selected Active Day
    setSlotsDraft(String(slotsPerDay[currentDay] ?? ""));
  }, [currentDay, slotsPerDay]);

  const saveDay = async () => {
    const headers =
      user?.isAdmin && user?.uuid
        ? { "x-admin-uuid": user.uuid }
        : { "x-admin-key": adminKey };
    try {
      await axios.post(
        `${baseUrl}/api/admin/settings/day`,
        { currentDay },
        { headers }
      );
      setSnack({
        open: true,
        message: `Active day set to ${currentDay.toUpperCase()}`,
        severity: "success",
      });
      setRefreshTick((t) => t + 1);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 401
          ? "Admin key/privileges required"
          : "Failed to save day");
      setSnack({ open: true, message: msg, severity: "error" });
    }
  };
  const onAnyUpload = () => {
    // toast or refresh status if needed
  };

  const saveSlot = async () => {
    const headers =
      user?.isAdmin && user?.uuid
        ? { "x-admin-uuid": user.uuid }
        : { "x-admin-key": adminKey };
    try {
      await axios.post(
        `${baseUrl}/api/admin/settings/slot`,
        { currentSlot },
        { headers }
      );
      setSnack({
        open: true,
        message: `Active slot set to ${currentSlot}`,
        severity: "success",
      });
      setRefreshTick((t) => t + 1);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 401
          ? "Admin key/privileges required"
          : "Failed to save slot");
      setSnack({ open: true, message: msg, severity: "error" });
    }
  };
  const saveSlotsPerDay = async () => {
    const headers =
      user?.isAdmin && user?.uuid
        ? { "x-admin-uuid": user.uuid }
        : { "x-admin-key": adminKey };
    const nRaw = slotsDraft.trim();
    const nParsed = Number(nRaw);
    const n = Number.isFinite(nParsed) && nParsed > 0 ? Math.floor(nParsed) : 1;
    try {
      await axios.post(
        `${baseUrl}/api/admin/settings/slots-per-day`,
        { day: currentDay, slots: n },
        { headers }
      );
      setSlotsPerDay((s) => ({ ...s, [currentDay]: n }));
      setSlotsDraft(String(n));
      setSnack({
        open: true,
        message: `Saved ${n} slots for ${currentDay.toUpperCase()}`,
        severity: "success",
      });
      setRefreshTick((t) => t + 1);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 401
          ? "Admin key/privileges required"
          : "Failed to save slots");
      setSnack({ open: true, message: msg, severity: "error" });
    }
  };

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 3, mt: 6 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography variant="h4" fontWeight={800}>
            Admin Settings
          </Typography>
          {!adminKey && (
            <Alert severity="warning" sx={{ py: 0, px: 1 }}>
              No ADMIN key (dev)
            </Alert>
          )}

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", md: "center" }}
            sx={{ flexWrap: "wrap" }}
          >
            <TextField
              select
              size="small"
              label="Active Day"
              value={currentDay}
              onChange={(e) => setCurrentDay(e.target.value)}
            >
              <MenuItem value="day1">Day 1</MenuItem>
              <MenuItem value="day2">Day 2</MenuItem>
              <MenuItem value="day3">Day 3</MenuItem>
              <MenuItem value="day4">Day 4</MenuItem>
            </TextField>
            <Button variant="contained" onClick={saveDay}>
              Save
            </Button>
            <TextField
              size="small"
              type="number"
              label={`Slots (${currentDay})`}
              inputProps={{ min: 1 }}
              value={slotsDraft}
              onChange={(e) => setSlotsDraft(e.target.value)}
              sx={{ ml: { md: 2 } }}
            />
            <Button variant="outlined" onClick={saveSlotsPerDay}>
              Save Slots
            </Button>
            <TextField
              select
              size="small"
              label="Active Slot"
              value={currentSlot}
              onChange={(e) => setCurrentSlot(Number(e.target.value))}
              sx={{ ml: { md: 2 } }}
            >
              {Array.from(
                { length: slotsPerDay[currentDay] || 1 },
                (_, i) => i + 1
              ).map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" onClick={saveSlot}>
              Activate
            </Button>
          </Stack>
        </Stack>
        <Box sx={{ mb: 2 }}>
          <ServerSettingsViewer
            adminKey={adminKey}
            adminUuid={user?.isAdmin ? user?.uuid : undefined}
            refreshKey={refreshTick}
          />
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab value="day1" label="Day 1" />
          <Tab value="day2" label="Day 2" />
          <Tab value="day3" label="Day 3" />
          <Tab value="day4" label="Day 4" />
        </Tabs>

        {tab === "day1" && (
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            }}
          >
            <UploadCard
              title="Quiz"
              day="day1"
              game="quiz"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
            <UploadCard
              title="Word Search"
              day="day1"
              game="wordSearch"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
            <UploadCard
              title="Jigsaw (Image or JSON)"
              day="day1"
              game="jigsaw"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
          </Box>
        )}

        {tab === "day2" && (
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            }}
          >
            <UploadCard
              title="Quiz"
              day="day2"
              game="quiz"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
            <UploadCard
              title="Word Search"
              day="day2"
              game="wordSearch"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
            <UploadCard
              title="Jigsaw (Image or JSON)"
              day="day2"
              game="jigsaw"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
          </Box>
        )}

        {tab === "day3" && (
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            }}
          >
            <UploadCard
              title="Quiz"
              day="day3"
              game="quiz"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
            <UploadCard
              title="Word Search"
              day="day3"
              game="wordSearch"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
            <UploadCard
              title="Jigsaw (Image or JSON)"
              day="day3"
              game="jigsaw"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
          </Box>
        )}

        {tab === "day4" && (
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            }}
          >
            <UploadCard
              title="Quiz"
              day="day4"
              game="quiz"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
            <UploadCard
              title="Word Search"
              day="day4"
              game="wordSearch"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
            <UploadCard
              title="Jigsaw (Image or JSON)"
              day="day4"
              game="jigsaw"
              slot={currentSlot}
              adminKey={adminKey}
              adminUuid={user?.isAdmin ? user?.uuid : undefined}
              onDone={onAnyUpload}
            />
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          <ContentBrowser
            adminKey={adminKey}
            adminUuid={user?.isAdmin ? user?.uuid : undefined}
            slotsPerDay={slotsPerDay}
          />
        </Box>
      </Container>
      <Snackbar
        open={snack.open}
        autoHideDuration={2000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </MuiAlert>
      </Snackbar>
    </>
  );
}
