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
import { GROUP_LABEL, GROUP_LOGO } from "../constant/group";
// import useGameSettings from "../../hooks/useGameSettings";
// import { baseUrl } from "../../constant";

// helper to pretty print
const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

export default function GroupSelectDialog({ open, onClose, day, onSelect }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [groupKey, setGroupKey] = React.useState("");
  const { groups } = useGameSettings();

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const dayKey = String(day).toLowerCase().replace(/\s+/g, "");
  const list =
    dayKey === "day2"
      ? groups.day2
      : dayKey === "day3"
      ? groups.day3
      : dayKey === "day4"
      ? groups.day4
      : [];
  // Default to saved value (if any) or first in list
  React.useEffect(() => {
    const saved = localStorage.getItem("ap_group_key") || "";
    setGroupKey(saved && list.includes(saved) ? saved : list[0] || "");
  }, [dayKey, list]);

  // If dialog is opened, check DB; if already selected, auto-close.
  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("ap_user") || "null");
        const uuid = user?.uuid || user?.uniqueNo;
        if (!uuid) return;
        const { data } = await axios.get(`${baseUrl}/api/asian-paint/group`, {
          params: { uuid },
        });
        const existing = data?.groupKey;
        if (existing) {
          // cache and notify parent, then close so the pop never shows again
          localStorage.setItem(`ap_group_key`, existing);
          localStorage.setItem(`ap_group_selected_${dayKey}`, "true");
          onSelect?.(existing);
          onClose?.();
        }
      } catch {}
    })();
  }, [open, dayKey, onClose, onSelect]);

  const confirm = async () => {
    if (!groupKey || saving) return;
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
      await axios.post(`${baseUrl}/api/asian-paint/group/select`, {
        uuid,
        groupKey,
      });

      // (optional) keep local cache in case you read it elsewhere
      localStorage.setItem("ap_group_key", groupKey);
      localStorage.setItem(`ap_group_selected_${dayKey}`, "true");

      // notify parent close
      onSelect?.(groupKey);

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
        label="Select Group"
        value={groupKey}
        onChange={(e) => setGroupKey(e.target.value)}
        disabled={!list.length}
        helperText={!list.length ? "No groups configured" : " "}
      >
        {list.map((key) => (
          <MenuItem key={key} value={key}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {GROUP_LOGO[key] ? (
                <Box
                  component="img"
                  src={GROUP_LOGO[key]}
                  alt={key}
                  sx={{ width: 18, height: 18, borderRadius: "50%" }}
                />
              ) : (
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: "divider",
                  }}
                />
              )}
              {GROUP_LABEL[key] || cap(key)}
            </Box>
          </MenuItem>
        ))}
      </TextField>

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
        <Button
          variant="contained"
          onClick={confirm}
          disabled={!groupKey || saving}
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
