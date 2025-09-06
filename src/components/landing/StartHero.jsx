import * as React from "react";
import Box from "@mui/material/Box";

/**
 * Round "Start" hero with title, hand and start button.
 * Pass additional content via children if you want to add more items later.
 */
export default function StartHero({
  visible = true,
  titleSrc,
  handSrc,
  startSrc,
  onStart,
  children,
}) {
  if (!visible) return null;
  return (
    <Box
      sx={{
        position: "relative",
        zIndex: 1,
        width: { xs: 260, sm: 400, md: 550 },
        height: { xs: 260, sm: 400, md: 550 },
        borderRadius: "50%",
        bgcolor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 30px 60px rgba(0,0,0,.45)",
      }}
    >
      {/* Title */}
      <Box
        component="img"
        src={titleSrc}
        alt="Event Title"
        sx={{
          position: "absolute",
          top: { xs: 26, sm: 33, md: 36 },
          width: { xs: "50%", sm: "55%", md: "45%" },
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* Hand */}
      <Box
        component="img"
        src={handSrc}
        alt="Controller Hand"
        sx={{
          position: "absolute",
          bottom: "-4%",
          left: { xs: "10", sm: "10%", md: "8%" },
          width: { xs: "72%", sm: "70%", md: "75%" },
          transform: "translateY(10%)",
        }}
      />

      {/* Start Button */}
      <Box
        component="img"
        src={startSrc}
        alt="Start"
        onClick={onStart}
        sx={{
          position: "absolute",
          bottom: { xs: "-25%", sm: "-21%", md: "-14%" },
          minWidth: { xs: 140, sm: 200 },
          height: { xs: 65, sm: 86 },
          transform: "translateY(10%)",
          "&:hover": { transform: "scale(1.01)" },
          transition: "0.18s ease",
          cursor: "pointer",
        }}
      />

      {/* Slot for extra items (badges, timer, etc.) */}
      {children}
    </Box>
  );
}
