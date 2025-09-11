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
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { baseUrl } from "../../components/constant/constant";

export default function AdminSettings() {
  const { user } = useAuth();
  const [tab, setTab] = React.useState("day1");
  const adminKey = import.meta.env.VITE_ADMIN_KEY || ""; // dev only
  console.log("adminKey", adminKey);
  const [currentDay, setCurrentDay] = React.useState("day1");
  const [currentSlot, setCurrentSlot] = React.useState(1);
  const [slotsPerDay, setSlotsPerDay] = React.useState({ day1: 1, day2: 1, day3: 1 });
  const [slotsDraft, setSlotsDraft] = React.useState("");

  React.useEffect(() => {
    const headers = user?.isAdmin && user?.uuid ? { "x-admin-uuid": user.uuid } : { "x-admin-key": adminKey };
    axios
      .get(`${baseUrl}/api/admin/settings`, { headers })
      .then((res) => {
        setCurrentDay(res.data?.currentDay || "day1");
        setCurrentSlot(res.data?.currentSlot || 1);
        setSlotsPerDay(res.data?.slotsPerDay || { day1: 1, day2: 1, day3: 1 });
        const spd = res.data?.slotsPerDay || { day1: 1, day2: 1, day3: 1 };
        setSlotsDraft(String(spd[tab] ?? ""));
      });
  }, [adminKey, user]);

  // Keep draft in sync when switching tabs or when server state changes
  React.useEffect(() => {
    setSlotsDraft(String(slotsPerDay[tab] ?? ""));
  }, [tab, slotsPerDay]);

  const saveDay = async () => {
    const headers = user?.isAdmin && user?.uuid ? { "x-admin-uuid": user.uuid } : { "x-admin-key": adminKey };
    await axios.post(`${baseUrl}/api/admin/settings/day`, { currentDay }, { headers });
  };
  const onAnyUpload = () => {
    // toast or refresh status if needed
  };

  const saveSlot = async () => {
    const headers = user?.isAdmin && user?.uuid ? { "x-admin-uuid": user.uuid } : { "x-admin-key": adminKey };
    await axios.post(`${baseUrl}/api/admin/settings/slot`, { currentSlot }, { headers });
  };
  const saveSlotsPerDay = async () => {
    const headers = user?.isAdmin && user?.uuid ? { "x-admin-uuid": user.uuid } : { "x-admin-key": adminKey };
    const nRaw = slotsDraft.trim();
    const nParsed = Number(nRaw);
    const n = Number.isFinite(nParsed) && nParsed > 0 ? Math.floor(nParsed) : 1;
    await axios.post(`${baseUrl}/api/admin/settings/slots-per-day`, { day: tab, slots: n }, { headers });
    setSlotsPerDay((s) => ({ ...s, [tab]: n }));
    setSlotsDraft(String(n));
  };

  return (
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
          </TextField>
          <Button variant="contained" onClick={saveDay}>
            Save
          </Button>
          <TextField
            size="small"
            type="number"
            label={`Slots (${tab})`}
            inputProps={{ min: 1 }}
            value={slotsDraft}
            onChange={(e) => setSlotsDraft(e.target.value)}
            sx={{ ml: { md: 2 } }}
          />
          <Button variant="outlined" onClick={saveSlotsPerDay}>Save Slots</Button>
          <TextField
            select
            size="small"
            label="Active Slot"
            value={currentSlot}
            onChange={(e) => setCurrentSlot(Number(e.target.value))}
            sx={{ ml: { md: 2 } }}
          >
            {Array.from({ length: slotsPerDay[currentDay] || 1 }, (_, i) => i + 1).map((n) => (
              <MenuItem key={n} value={n}>{n}</MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" onClick={saveSlot}>Activate</Button>
        </Stack>
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="day1" label="Day 1" />
        <Tab value="day2" label="Day 2" />
        <Tab value="day3" label="Day 3" />
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
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" } }}>
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
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" } }}>
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

      <Box sx={{ mt: 3 }}>
        <ContentBrowser
          adminKey={adminKey}
          adminUuid={user?.isAdmin ? user?.uuid : undefined}
          slotsPerDay={slotsPerDay}
        />
      </Box>
    </Container>
  );
}
