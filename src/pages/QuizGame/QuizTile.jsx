// src/components/quiz/QuizTile.jsx
import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogContent,
  Stack,
  Typography,
} from "@mui/material";
import DailyQuiz from "./DailyQuiz.jsx";
// import DailyQuiz from "./DailyQuiz";

export default function QuizTile({
  title = "Daily Quiz",
  subtitle = "Play now",
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card elevation={4} sx={{ height: "100%" }}>
        <CardActionArea onClick={() => setOpen(true)} sx={{ height: "100%" }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h6">{title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Button variant="contained" size="small">
                  Open Quiz
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <DailyQuiz onClose={() => setOpen(false)} dense />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
