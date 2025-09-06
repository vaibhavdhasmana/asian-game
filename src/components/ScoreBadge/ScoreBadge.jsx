// import * as React from "react";
// import { Box, Chip, Skeleton } from "@mui/material";
// import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
// import { useAuth } from "../../context/AuthContext";
// import useTotalScore from "../../hooks/useTotalScore";
// import StarsIcon from "@mui/icons-material/Stars";
// // Recursively sum all numbers inside an object
// function sumNumbers(obj) {
//   if (!obj || typeof obj !== "object") return 0;
//   return Object.values(obj).reduce((acc, v) => {
//     if (typeof v === "number" && !Number.isNaN(v)) return acc + v;
//     if (v && typeof v === "object") return acc + sumNumbers(v);
//     return acc;
//   }, 0);
// }

// export default function ScoreBadge() {
//   const { user, isAuthed } = useAuth();
//   if (!isAuthed) return null;
//   const uuid = user?.uuid;
//   //   const totalScore = React.useMemo(() => sumNumbers(user?.score), [user]);s
//   const { total, loading, error } = useTotalScore(uuid);

//   return (
//     <Box
//       sx={{
//         position: "fixed",
//         // place it just below your fixed AppBar: 56px (xs) / 64px (sm+) + small gap
//         top: { xs: 64, sm: 72 },
//         right: 12,

//         zIndex: (t) => t.zIndex.appBar - 1, // under the AppBar, above content
//       }}
//     >
//       {" "}
//       {loading ? (
//         <Skeleton variant="rounded" width={120} height={32} />
//       ) : (
//         <Chip
//           sx={{
//             background: "#030042",
//             color: "#41E3FE",
//           }}
//           icon={<StarsIcon />}
//           variant="outlined"
//           label={error ? "Score: --" : `Score: ${total}`}
//           // sx={{ fontWeight: 800 }}
//           aria-label={`Total score ${total}`}
//         />
//       )}
//     </Box>
//   );
// }
import * as React from "react";
import { Box, Chip, Skeleton, Stack } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
// import useTotalScore from "../../hooks/useTotalScore";
import { useAuth } from "../../context/AuthContext";
import { GROUP_COLOR_HEX, GROUP_LABEL } from "../constant/group";
import useGameSettings from "../../hooks/useGameSettings";
// import { GROUP_LABEL, GROUP_COLOR_HEX } from "../constant/groups";
import useTotalScore from "../../hooks/useTotalScore";
export default function ScoreBadge() {
  const { user, isAuthed } = useAuth();
  const { currentDay } = useGameSettings();
  const uuid = user?.uuid;
  const { total, loading, error } = useTotalScore(uuid);

  if (!isAuthed) return null;

  // read saved group for day2/day3
  const dayKey = String(currentDay).toLowerCase().replace(/\s+/g, "");
  const storageKey = `ap_group_color`;
  const savedGroup =
    currentDay === "day2" || currentDay === "day3"
      ? localStorage.getItem(storageKey) || ""
      : "";

  const groupLabel = GROUP_LABEL[savedGroup] || (savedGroup ? savedGroup : "");
  const groupBg = GROUP_COLOR_HEX[savedGroup];

  return (
    <Box
      sx={{
        position: "fixed",
        top: { xs: 64, sm: 72 },
        right: 12,
        zIndex: (t) => t.zIndex.appBar - 1,
      }}
    >
      {loading ? (
        <Skeleton variant="rounded" width={180} height={32} />
      ) : (
        <Stack
          sx={{
            direction: {
              xs: "column",
              md: "row",
            },
          }}
          spacing={1}
          alignItems="center"
        >
          {/* Group chip (only for day2/day3 when selected) */}
          {groupLabel && (
            <Chip
              size="small"
              label={`Group: ${groupLabel}`}
              sx={{
                fontWeight: 800,
                bgcolor: groupBg || "action.selected",
                color: groupBg ? "#fff" : "inherit",
              }}
            />
          )}

          {/* Score chip */}
          <Chip
            size="small"
            icon={<EmojiEventsIcon />}
            color={error ? "default" : "warning"}
            variant="outlined"
            label={error ? "Score: --" : `Score: ${total}`}
            sx={{ fontWeight: 800 }}
            aria-label={
              error ? "Total score unavailable" : `Total score ${total}`
            }
          />
        </Stack>
      )}
    </Box>
  );
}
