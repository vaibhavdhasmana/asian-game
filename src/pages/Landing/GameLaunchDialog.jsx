// src/components/GameLaunchDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

export default function GameLaunchDialog({
  open,
  onClose,
  onConfirm,
  title = "Ready to play?",
  description = "This game is time-bound. Match the tiles to complete the jigsaw. Your score auto-saves.",
  confirmLabel = "OK",
  cancelLabel = "Cancel",
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="text">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
