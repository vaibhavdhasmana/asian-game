import * as React from "react";
import { LinearProgress } from "@mui/material";

/**
 * Thin loader bar you can place in a relative container.
 * Put it inside a Paper/Box that's position: relative or wrap with sx={{ position: 'relative' }}
 */
export default function LinearLoader({ show }) {
  if (!show) return null;
  return (
    <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0 }} />
  );
}
