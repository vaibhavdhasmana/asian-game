// import * as React from "react";
// import {
//   Box,
//   Dialog,
//   Slide,
//   useMediaQuery,
//   useTheme,
//   SwipeableDrawer,
//   IconButton,
//   Typography,
//   Stack,
// } from "@mui/material";
// import CloseIcon from "@mui/icons-material/Close";
// import LeaderBoard from "./LeaderBoard";
// // import Leaderboard from "./Leaderboard.jsx";
// // import Leaderboard from "./Leaderboard";
// // import Leaderboard from "./Leaderboard";

// const Up = React.forwardRef(function Up(props, ref) {
//   return <Slide direction="up" ref={ref} {...props} />;
// });

// export default function ResponsiveLeaderboard({ open, onClose }) {
//   const theme = useTheme();
//   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

//   if (isMobile) {
//     // Bottom sheet on mobile
//     return (
//       <SwipeableDrawer
//         anchor="bottom"
//         open={open}
//         onOpen={() => {}}
//         onClose={onClose}
//         disableSwipeToOpen
//         PaperProps={{
//           sx: {
//             height: "82vh",
//             borderTopLeftRadius: 24,
//             borderTopRightRadius: 24,
//             background: "linear-gradient(180deg, #10162F 0%, #0B1025 100%)",
//             color: "white",
//             overflow: "hidden",
//           },
//         }}
//       >
//         <Box sx={{ p: 1.5, pb: 0, position: "relative" }}>
//           {/* grabber */}
//           <Box
//             sx={{
//               width: 40,
//               height: 4,
//               borderRadius: 999,
//               mx: "auto",
//               bgcolor: "rgba(255,255,255,.35)",
//               mb: 1,
//             }}
//           />
//           <Stack
//             direction="row"
//             alignItems="center"
//             justifyContent="space-between"
//             sx={{ px: 0.5, mb: 1 }}
//           >
//             <Typography variant="h6" fontWeight={800}>
//               Leaderboard
//             </Typography>
//             <IconButton
//               size="small"
//               onClick={onClose}
//               sx={{ color: "inherit" }}
//             >
//               <CloseIcon />
//             </IconButton>
//           </Stack>
//         </Box>

//         {/* content scrolls */}
//         <Box sx={{ px: 1.5, pb: 2, overflow: "auto" }}>
//           <LeaderBoard defaultTab="day1" />
//         </Box>
//       </SwipeableDrawer>
//     );
//   }

//   // Centered dialog on desktop
//   return (
//     <Dialog
//       open={open}
//       onClose={onClose}
//       TransitionComponent={Up}
//       fullWidth
//       maxWidth="md"
//       PaperProps={{
//         sx: {
//           borderRadius: 3,
//           background: "linear-gradient(135deg, #0B1025 0%, #1B2243 100%)",
//           color: "white",
//           overflow: "hidden",
//         },
//       }}
//     >
//       <Stack
//         direction="row"
//         alignItems="center"
//         justifyContent="space-between"
//         sx={{ p: 2, pb: 0 }}
//       >
//         <Typography variant="h6" fontWeight={800}>
//           Leaderboard
//         </Typography>
//         <IconButton size="small" onClick={onClose} sx={{ color: "inherit" }}>
//           <CloseIcon />
//         </IconButton>
//       </Stack>
//       <Box sx={{ p: 2, pt: 1 }}>
//         <LeaderBoard defaultTab="overall" />
//       </Box>
//     </Dialog>
//   );
// }

// src/components/Leaderboard/ResponsiveLeaderboard.jsx
import * as React from "react";
import {
  Box,
  Dialog,
  Slide,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
  IconButton,
  Typography,
  Stack,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useAuth } from "../../context/AuthContext";
import LeaderBoard from "./LeaderBoard";
import useLeaderboard from "../../hooks/useLeaderBoard";

const Up = React.forwardRef(function Up(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function ResponsiveLeaderboard({ open, onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // 👇 overall rank for the header
  const { user } = useAuth();
  const { rows: overallRows, loading: overallLoading } = useLeaderboard({
    scope: "overall",
    limit: 1000, // ensure we can find the user
  });
  const overallRank = React.useMemo(() => {
    const idx = overallRows.findIndex((r) => r.uuid === user?.uuid);
    return idx >= 0 ? idx + 1 : null;
  }, [overallRows, user]);

  const RankChip = (
    <Chip
      size="small"
      color="success"
      variant="filled"
      label={`Overall: ${
        overallLoading ? "…" : overallRank ? `#${overallRank}` : "—"
      }`}
      sx={{ fontWeight: 800 }}
    />
  );

  if (isMobile) {
    // Bottom sheet on mobile
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onOpen={() => {}}
        onClose={onClose}
        disableSwipeToOpen
        PaperProps={{
          sx: {
            height: "82vh",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            background: "linear-gradient(180deg, #10162F 0%, #0B1025 100%)",
            color: "white",
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ p: 1.5, pb: 0, position: "relative" }}>
          <Box
            sx={{
              width: 40,
              height: 4,
              borderRadius: 999,
              mx: "auto",
              bgcolor: "rgba(255,255,255,.35)",
              mb: 1,
            }}
          />
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 0.5, mb: 1, gap: 1 }}
          >
            <Typography variant="h6" fontWeight={800}>
              Leaderboard
            </Typography>
            {RankChip}
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ color: "inherit" }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ px: 1.5, pb: 2, overflow: "auto" }}>
          <LeaderBoard defaultTab="day1" />
        </Box>
      </SwipeableDrawer>
    );
  }

  // Centered dialog on desktop
  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Up}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: "linear-gradient(135deg, #0B1025 0%, #1B2243 100%)",
          color: "white",
          overflow: "hidden",
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: 2, pb: 0, gap: 1 }}
      >
        <Typography variant="h6" fontWeight={800}>
          Leaderboard
        </Typography>
        {RankChip}
        <IconButton size="small" onClick={onClose} sx={{ color: "inherit" }}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <Box sx={{ p: 2, pt: 1 }}>
        <LeaderBoard defaultTab="overall" />
      </Box>
    </Dialog>
  );
}
