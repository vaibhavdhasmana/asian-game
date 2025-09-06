import * as React from "react";
import Box from "@mui/material/Box";

export default function LogoBar({ logoSrc, hidden = false }) {
  if (hidden) return null;
  return (
    <Box
      sx={{
        py: { xs: 2, sm: 3 },
        display: "flex",
        justifyContent: "center",
        left: 0,
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: (t) => t.zIndex.appBar - 1, // under AppBar (when authed)
      }}
    >
      <Box
        component="img"
        src={logoSrc}
        alt="Asian Paints"
        sx={{ height: { xs: 65, sm: 70, md: 90 }, p: 1.2 }}
      />
    </Box>
  );
}
