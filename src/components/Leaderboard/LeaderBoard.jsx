// import * as React from "react";
// import {
//   Box,
//   Paper,
//   Tabs,
//   Tab,
//   Stack,
//   Typography,
//   IconButton,
//   List,
//   ListItem,
//   ListItemAvatar,
//   Avatar,
//   ListItemText,
//   Chip,
//   Divider,
//   Tooltip,
//   Skeleton,
// } from "@mui/material";
// import RefreshIcon from "@mui/icons-material/Refresh";
// import { useAuth } from "../../context/AuthContext";
// import Podium from "./Podium";
// import useLeaderboard from "../../hooks/useLeaderBoard";

// const TABS = [
//   { key: "day1", label: "Day 1" },
//   { key: "day2", label: "Day 2" },
//   { key: "day3", label: "Day 3" },
//   { key: "overall", label: "Overall" },
// ];

// const initials = (name = "", uuid = "") => {
//   const parts = name.trim().split(" ").filter(Boolean);
//   if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
//   if (parts.length === 1)
//     return parts[0][0]?.toUpperCase() || uuid.slice(0, 2).toUpperCase();
//   return uuid.slice(0, 2).toUpperCase();
// };

// export default function LeaderBoard({ defaultTab = "overall" }) {
//   const { user } = useAuth();
//   const [tab, setTab] = React.useState(defaultTab);
//   const scope = tab === "overall" ? "overall" : "day";
//   const day = tab === "overall" ? undefined : tab;

//   const { top3, rows, loading, error, refresh } = useLeaderboard({
//     scope,
//     day: day || "day1",
//     limit: 100,
//   });

//   // Safety: ensure rank-sorted (desc) even if API already sorted
//   const sortedRows = React.useMemo(() => {
//     const copy = [...rows];
//     copy.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
//     return copy;
//   }, [rows]);

//   // Rank lookup (1-based) from the full sorted list
//   const rankByUuid = React.useMemo(() => {
//     const m = new Map();
//     sortedRows.forEach((r, i) => m.set(r.uuid, i + 1));
//     return m;
//   }, [sortedRows]);

//   // My rank for the current tab (not overall)
//   const myRank = rankByUuid.get(user?.uuid) || null;

//   return (
//     <Paper elevation={6} sx={{ p: 2, borderRadius: 3 }}>
//       {/* Tabs + refresh (no search) */}
//       <Stack
//         direction={{ xs: "column", sm: "row" }}
//         alignItems="center"
//         justifyContent="space-between"
//         spacing={1}
//         sx={{
//           mb: 2,
//           overflowX: { xs: "scroll", md: "unset" },
//           pl: { xs: 5, md: 0 },
//         }}
//       >
//         <Tabs
//           value={tab}
//           onChange={(_, v) => setTab(v)}
//           variant="scrollable"
//           allowScrollButtonsMobile
//           sx={{
//             ".MuiTab-root": {
//               fontSize: { xs: "12px", sm: "14px", md: "16px" },
//               fontWeight: 800,
//             },
//           }}
//         >
//           {TABS.map((t) => (
//             <Tab key={t.key} value={t.key} label={t.label} />
//           ))}
//         </Tabs>

//         {/* <Tooltip title="Refresh">
//           <IconButton onClick={refresh}>
//             <RefreshIcon />
//           </IconButton>
//         </Tooltip> */}
//       </Stack>

//       {/* Podium (top 3) */}
//       {loading ? (
//         <Box
//           sx={{
//             display: "grid",
//             gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
//             gap: 2,
//             mb: 2,
//           }}
//         >
//           {[0, 1, 2].map((i) => (
//             <Skeleton key={i} variant="rounded" height={140} />
//           ))}
//         </Box>
//       ) : (
//         <Podium top3={sortedRows.slice(0, 3)} />
//       )}

//       {/* Rest of leaderboard (rank-sorted) */}
//       <Paper
//         variant="outlined"
//         sx={{
//           p: 1,
//           borderRadius: 2,
//           maxHeight: { xs: 360, sm: 420 },
//           overflow: "auto",
//         }}
//       >
//         {loading ? (
//           <Box sx={{ p: 2, display: "grid", gap: 1 }}>
//             {Array.from({ length: 8 }).map((_, i) => (
//               <Skeleton key={i} variant="rounded" height={48} />
//             ))}
//           </Box>
//         ) : (
//           <List dense>
//             {sortedRows.slice(3).map((r, idx) => {
//               const rank = idx + 4; // after top3
//               const isMe = r.uuid === user?.uuid;
//               return (
//                 <React.Fragment key={`${r.uuid}-${rank}`}>
//                   <ListItem
//                     sx={{
//                       borderRadius: 1,
//                       mb: 0.5,
//                       bgcolor: isMe ? "warning.light" : "transparent",
//                     }}
//                     secondaryAction={
//                       <Chip
//                         sx={{
//                           fontSize: { xs: "12px", sm: "14px", md: "16px" },
//                         }}
//                         label={`${r.total} pts`}
//                         color={isMe ? "warning" : "default"}
//                       />
//                     }
//                   >
//                     <ListItemAvatar>
//                       <Avatar sx={{ fontWeight: 900 }}>
//                         {initials(r.name, r.uuid)}
//                       </Avatar>
//                     </ListItemAvatar>
//                     <ListItemText
//                       primary={
//                         <Typography
//                           sx={{
//                             fontSize: { xs: "12px", sm: "14px", md: "16px" },
//                           }}
//                           fontWeight={600}
//                         >
//                           #{rank} {r.name || r.uuid}
//                         </Typography>
//                       }
//                       secondary={
//                         <Typography
//                           sx={{
//                             fontSize: { xs: "12px", sm: "14px", md: "16px" },
//                           }}
//                           variant="caption"
//                           color="text.secondary"
//                         >
//                           {r.uuid}
//                         </Typography>
//                       }
//                     />
//                   </ListItem>
//                   <Divider component="li" />
//                 </React.Fragment>
//               );
//             })}

//             {sortedRows.length <= 3 && (
//               <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
//                 {error ? "Couldn’t load leaderboard." : "Not enough data yet."}
//               </Box>
//             )}
//           </List>
//         )}
//       </Paper>

//       {/* (Optional) Your rank in current tab */}
//       {!loading && myRank && (
//         <Box sx={{ mt: 1.5 }}>
//           <Chip
//             color="info"
//             variant="outlined"
//             label={`Your position at ${tab} : #${myRank}`}
//             sx={{ fontWeight: 800 }}
//           />
//         </Box>
//       )}
//     </Paper>
//   );
// }
// src/components/Leaderboard/LeaderBoard.jsx
import * as React from "react";
import { Paper, Tabs, Tab, Stack } from "@mui/material";
import useGameSettings from "../../hooks/useGameSettings";
import IndividualDayLeaderboard from "./IndividualDayLeaderboard";
import GroupedLeaderboard from "./GroupedLeaderboard";
import OverallIndividualLeaderboard from "./OverallIndividualLeaderboard";

const TABS = [
  { key: "day1", label: "Day 1" },
  { key: "day2", label: "Day 2" },
  { key: "day3", label: "Day 3" },
  { key: "overall", label: "Overall" },
];

export default function LeaderBoard({ defaultTab = "overall" }) {
  const [tab, setTab] = React.useState(defaultTab);
  const { currentDay } = useGameSettings();
  const visibleTabs = React.useMemo(() => {
    const days = [];
    if (currentDay === "day1") days.push("day1");
    else if (currentDay === "day2") days.push("day1", "day2");
    else days.push("day1", "day2", "day3");
    return [
      ...TABS.filter((t) => days.includes(t.key)),
      TABS.find((t) => t.key === "overall"),
    ].filter(Boolean);
  }, [currentDay]);

  React.useEffect(() => {
    // If current tab is not visible anymore, reset to overall
    const allowed = visibleTabs.map((t) => t.key);
    if (!allowed.includes(tab)) setTab("overall");
  }, [visibleTabs, tab]);

  return (
    <Paper elevation={6} sx={{ p: 2, borderRadius: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{
          mb: 2,
          overflowX: { xs: "auto", md: "unset" },
          pl: { xs: 1, md: 0 },
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{
            ".MuiTab-root": {
              fontSize: { xs: "12px", md: "18px" },
              fontWeight: 600,
            },
          }}
        >
          {visibleTabs.map((t) => (
            <Tab key={t.key} value={t.key} label={t.label} />
          ))}
        </Tabs>
      </Stack>

      {tab === "day1" && <IndividualDayLeaderboard day="day 1" />}
      {tab === "day2" && <GroupedLeaderboard day="day2" />}
      {tab === "day3" && <GroupedLeaderboard day="day3" />}
      {tab === "overall" && <OverallIndividualLeaderboard />}
    </Paper>
  );
}
