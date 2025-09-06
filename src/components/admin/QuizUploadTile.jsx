import React, { useState } from "react";
import {
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import QuizUpload from "./QuizUpload";

export default function QuizUploadTile() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card elevation={4} sx={{ height: "100%" }}>
        <CardActionArea onClick={() => setOpen(true)} sx={{ height: "100%" }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h6">Upload Quiz (Admin)</Typography>
              <Typography variant="body2" color="text.secondary">
                Upload CSV for Day 1/2/3 (grouped).
              </Typography>
              <Button variant="contained" size="small" sx={{ mt: 1 }}>
                Open Uploader
              </Button>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
      <QuizUpload open={open} onClose={() => setOpen(false)} />
    </>
  );
}
