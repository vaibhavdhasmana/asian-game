import * as React from "react";
import Box from "@mui/material/Box";

export default function FullScreenStage({ background, children, isAuthed }) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundImage: `url(${background})`,
        backgroundSize: { xs: "cover", sm: "cover", md: "100% 100%" },
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Centered, full-viewport layer */}

      {!isAuthed ? (
        <Box
          sx={{
            width: "100%",
            height: "100dvh",
            position: "fixed",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {children}
        </Box>
      ) : (
        <>{children}</>
      )}
    </Box>
  );
}
