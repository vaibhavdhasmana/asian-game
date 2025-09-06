import * as React from "react";
import { Button, CircularProgress } from "@mui/material";

/**
 * MUI Button that shows spinner + disables when loading.
 * Props:
 *  - loading: boolean
 *  - loadingLabel: string (optional)
 *  - startIcon: any (used when NOT loading)
 */
export default function LoadingButton({
  loading,
  loadingLabel = "Please wait...",
  children,
  startIcon,
  disabled,
  ...props
}) {
  return (
    <Button
      {...props}
      disabled={loading || disabled}
      startIcon={loading ? <CircularProgress size={18} /> : startIcon}
    >
      {loading ? loadingLabel : children}
    </Button>
  );
}
