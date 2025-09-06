// src/components/admin/GroupMatrix.jsx
import * as React from "react";
import { Grid, MenuItem, TextField } from "@mui/material";
import UploadCard from "./UploadCard";

const COLORS = [
  "purple",
  "green",
  "orange",
  "yellow",
  "red",
  "blue",
  "pink",
  "brown",
  "gray",
  "black",
];

export default function GroupMatrix({
  day,
  groupsCount = 10,
  adminKey,
  onDone,
}) {
  const [rows, setRows] = React.useState(
    Array.from({ length: groupsCount }).map((_, i) => ({
      idx: i,
      color: COLORS[i % COLORS.length],
    }))
  );

  const updateColor = (i, color) => {
    setRows((r) => r.map((x) => (x.idx === i ? { ...x, color } : x)));
  };

  return (
    <Grid container spacing={2}>
      {rows.map(({ idx, color }) => {
        const key = `${color}-${String(idx + 1).padStart(2, "0")}`;
        return (
          <Grid key={key} item xs={12} md={6}>
            <TextField
              select
              size="small"
              label={`Group ${idx + 1} Color`}
              value={color}
              onChange={(e) => updateColor(idx, e.target.value)}
              sx={{ mb: 1 }}
            >
              {COLORS.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>

            <Grid container spacing={1}>
              <Grid item xs={12} sm={4}>
                <UploadCard
                  title="Quiz"
                  day={day}
                  game="quiz"
                  groupKey={key}
                  adminKey={adminKey}
                  onDone={onDone}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <UploadCard
                  title="Crossword"
                  day={day}
                  game="crossword"
                  groupKey={key}
                  adminKey={adminKey}
                  onDone={onDone}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <UploadCard
                  title="Word Search"
                  day={day}
                  game="wordSearch"
                  groupKey={key}
                  adminKey={adminKey}
                  onDone={onDone}
                />
              </Grid>
            </Grid>
          </Grid>
        );
      })}
    </Grid>
  );
}
