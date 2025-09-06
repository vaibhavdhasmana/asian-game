import * as React from "react";
import { Backdrop, CircularProgress, Box, Typography } from "@mui/material";

/**
 * Blocks the screen (or a section if you portal it) with a spinner.
 * Props:
 *  - open: boolean
 *  - zIndex: number (default 2000)
 *  - label: optional text under the spinner
 */
export default function LoadingOverlay({ open, zIndex = 2000, label }) {
  return (
    <Backdrop open={!!open} sx={{ color: "#fff", zIndex }}>
      <Box sx={{ display: "grid", placeItems: "center", gap: 1 }}>
        <CircularProgress />
        {label ? <Typography>{label}</Typography> : null}
      </Box>
    </Backdrop>
  );
}
