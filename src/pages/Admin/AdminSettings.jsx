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
import GroupMatrix from "../../components/admin/GroupMatrix";
import axios from "axios";
import { baseUrl } from "../../components/constant/constant";
import ColorGroupsEditor from "../../components/admin/ColorGroupsEditor";
import ColorUploadMatrix from "../../components/admin/ColorUploadMatrix";
import QuizUploadTile from "../../components/admin/QuizUploadTile";

export default function AdminSettings() {
  const [tab, setTab] = React.useState("day1");
  const [groups2, setGroups2] = React.useState(5);
  const [groups3, setGroups3] = React.useState(5);
  const adminKey = import.meta.env.VITE_ADMIN_KEY || ""; // dev only
  console.log("adminKey", adminKey);
  const [currentDay, setCurrentDay] = React.useState("day1");
  const [groupsColors, setGroupsColors] = React.useState({
    day2: [],
    day3: [],
  });

  React.useEffect(() => {
    axios
      .get(`${baseUrl}/api/admin/settings`, {
        headers: { "x-admin-key": adminKey },
      })
      .then((res) => {
        setCurrentDay(res.data?.currentDay || "day1");
        setGroupsColors(res.data?.groupsColors || { day2: [], day3: [] });
      });
  }, [adminKey]);

  const saveDay = async () => {
    await axios.post(
      `${baseUrl}/api/admin/settings/day`,
      { currentDay },
      { headers: { "x-admin-key": adminKey } }
    );
  };
  const onAnyUpload = () => {
    // toast or refresh status if needed
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

        <Stack direction="row" spacing={1} alignItems="center">
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
        </Stack>
      </Stack>
      <Grid item xs={12} sm={6} md={4}>
        <QuizUploadTile />
      </Grid>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="day1" label="Day 1" />
        <Tab value="day2" label="Day 2 (Grouped)" />
        <Tab value="day3" label="Day 3 (Grouped)" />
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
            adminKey={adminKey}
            onDone={onAnyUpload}
          />
          <UploadCard
            title="Crossword"
            day="day1"
            game="crossword"
            adminKey={adminKey}
            onDone={onAnyUpload}
          />
          <UploadCard
            title="Word Search"
            day="day1"
            game="wordSearch"
            adminKey={adminKey}
            onDone={onAnyUpload}
          />
        </Box>
      )}

      {tab === "day2" && (
        <>
          <ColorGroupsEditor
            day="day2"
            colors={groupsColors.day2}
            onChange={(arr) => setGroupsColors((s) => ({ ...s, day2: arr }))}
            adminKey={adminKey}
          />
          <ColorUploadMatrix
            day="day2"
            colors={groupsColors.day2}
            adminKey={adminKey}
            onDone={() => {}}
          />
        </>
      )}

      {tab === "day3" && (
        <>
          <ColorGroupsEditor
            day="day3"
            colors={groupsColors.day3}
            onChange={(arr) => setGroupsColors((s) => ({ ...s, day3: arr }))}
            adminKey={adminKey}
          />
          <ColorUploadMatrix
            day="day3"
            colors={groupsColors.day3}
            adminKey={adminKey}
            onDone={() => {}}
          />
        </>
      )}
    </Container>
  );
}
