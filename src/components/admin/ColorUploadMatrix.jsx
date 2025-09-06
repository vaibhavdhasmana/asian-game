// src/components/admin/ColorUploadMatrix.jsx
import * as React from "react";
import { Grid, Typography } from "@mui/material";
import UploadCard from "./UploadCard";

export default function ColorUploadMatrix({ day, colors, adminKey, onDone }) {
  return (
    <Grid container spacing={2} sx={{ mt: 2 }}>
      {colors.map((color) => (
        <Grid key={color} item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
            {color.toUpperCase()}
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={4}>
              <UploadCard
                title="Quiz"
                day={day}
                game="quiz"
                groupKey={color}
                adminKey={adminKey}
                onDone={onDone}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <UploadCard
                title="Crossword"
                day={day}
                game="crossword"
                groupKey={color}
                adminKey={adminKey}
                onDone={onDone}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <UploadCard
                title="Word Search"
                day={day}
                game="wordSearch"
                groupKey={color}
                adminKey={adminKey}
                onDone={onDone}
              />
            </Grid>
          </Grid>
        </Grid>
      ))}
    </Grid>
  );
}
