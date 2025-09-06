import * as React from "react";
import {
  Dialog,
  SwipeableDrawer,
  useMediaQuery,
  useTheme,
  Box,
  Stack,
  Typography,
  IconButton,
  Button,
  Chip,
  TextField,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import useGameSettings from "../../hooks/useGameSettings";
import { baseUrl } from "../constant/constant";
import axios from "axios";
// import useGameSettings from "../../hooks/useGameSettings";
// import { baseUrl } from "../../constant";

// helper to pretty print
const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

export default function GroupSelectDialog({ open, onClose, day, onSelect }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [color, setColor] = React.useState("");
  const { groupsColors } = useGameSettings();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const dayKey = String(day).toLowerCase().replace(/\s+/g, "");
  const list =
    dayKey === "day2"
      ? groupsColors.day2
      : dayKey === "day3"
      ? groupsColors.day3
      : [];
  // Default to saved value (if any) or first in list
  React.useEffect(() => {
    const saved = localStorage.getItem("ap_group_color") || "";
    setColor(saved && list.includes(saved) ? saved : list[0] || "");
  }, [dayKey, list]);

  // If dialog is opened, check DB; if already selected, auto-close.
  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("ap_user") || "null");
        const uuid = user?.uuid || user?.uniqueNo;
        if (!uuid) return;
        const { data } = await axios.get(
          `${baseUrl}/api/asian-paint/group/color`,
          {
            params: { uuid, day: dayKey },
          }
        );
        console.log("data", data);
        const existing = data?.color;
        if (existing) {
          // cache and notify parent, then close so the pop never shows again
          localStorage.setItem(`ap_group_color`, existing);
          localStorage.setItem(`ap_group_selected_${dayKey}`, "true");
          onSelect?.(existing);
          onClose?.();
        }
      } catch {}
    })();
  }, [open, dayKey, onClose, onSelect]);

  const confirm = async () => {
    if (!color || saving) return;
    setError("");
    try {
      // identify user
      const user = JSON.parse(localStorage.getItem("ap_user") || "null");
      const uuid = user?.uuid || user?.uniqueNo;
      if (!uuid) {
        setError("No player ID found. Please login again.");
        return;
      }

      setSaving(true);
      // persist to DB
      await axios.post(`${baseUrl}/api/asian-paint/group/color`, {
        uuid,
        day: dayKey, // "day2" | "day3"
        color, // e.g. "red" | "#FF0000"
      });

      // (optional) keep local cache in case you read it elsewhere
      localStorage.setItem("ap_group_color", color);
      localStorage.setItem(`ap_group_selected_${dayKey}`, "true");

      // notify parent close
      onSelect?.(color);

      onClose?.();
    } catch (e) {
      setError(
        e?.response?.data?.message || "Failed to save group. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ p: 2, pb: 1 }}
    >
      <Typography variant="h6" fontWeight={800}>
        Select Your Group
      </Typography>
      <IconButton size="small" onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </Stack>
  );

  const content = (
    <Box sx={{ p: 2, pt: 1 }}>
      <Chip
        label={`Active: ${dayKey.toUpperCase()}`}
        color="warning"
        sx={{ mb: 2 }}
      />
      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}
      <TextField
        select
        fullWidth
        label="Group (color)"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        disabled={!list.length}
        helperText={!list.length ? "No groups configured" : " "}
      >
        {list.map((c) => (
          <MenuItem key={c} value={c}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: c, // assumes CSS color names or hex in list
                  border: "1px solid rgba(0,0,0,0.2)",
                }}
              />
              {cap(c)}
            </Box>
          </MenuItem>
        ))}
      </TextField>

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
        <Button
          variant="contained"
          onClick={confirm}
          disabled={!color || saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </Stack>
    </Box>
  );

  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onOpen={() => {}}
        onClose={onClose}
        PaperProps={{
          sx: {
            height: "60vh",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
        }}
      >
        {header}
        {content}
      </SwipeableDrawer>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {header}
      {content}
    </Dialog>
  );
}
