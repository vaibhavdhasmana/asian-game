// src/components/admin/ColorUploadMatrix.jsx
import * as React from "react";
import { Grid, Typography, Button, Paper, Stack } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import QuizUpload from "./QuizUpload";
import CrosswordUpload from "./CrosswordUpload";
import WordSearchUpload from "./WordSearchUpload";

export default function ColorUploadMatrix({ day, colors, adminKey, onDone }) {
  const [uploadDialog, setUploadDialog] = React.useState({
    open: false,
    type: "", // "quiz", "crossword", "wordSearch"
    color: "",
  });

  const openUpload = (type, color) => {
    setUploadDialog({ open: true, type, color });
  };

  const closeUpload = () => {
    setUploadDialog({ open: false, type: "", color: "" });
  };

  const handleUploadDone = () => {
    onDone?.();
    closeUpload();
  };

  return (
    <>
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {colors.map((color) => (
          <Grid key={color} item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
              {color.toUpperCase()}
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography fontWeight={800}>Quiz</Typography>
                    <Button
                      startIcon={<UploadFileIcon />}
                      variant="outlined"
                      onClick={() => openUpload("quiz", color)}
                      fullWidth
                    >
                      Upload Quiz
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography fontWeight={800}>Crossword</Typography>
                    <Button
                      startIcon={<UploadFileIcon />}
                      variant="outlined"
                      onClick={() => openUpload("crossword", color)}
                      fullWidth
                    >
                      Upload Crossword
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography fontWeight={800}>Word Search</Typography>
                    <Button
                      startIcon={<UploadFileIcon />}
                      variant="outlined"
                      onClick={() => openUpload("wordSearch", color)}
                      fullWidth
                    >
                      Upload Word Search
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        ))}
      </Grid>

      {/* Upload Dialogs */}
      <QuizUpload
        open={uploadDialog.open && uploadDialog.type === "quiz"}
        onClose={closeUpload}
      />
      <CrosswordUpload
        open={uploadDialog.open && uploadDialog.type === "crossword"}
        onClose={closeUpload}
      />
      <WordSearchUpload
        open={uploadDialog.open && uploadDialog.type === "wordSearch"}
        onClose={closeUpload}
      />
    </>
  );
}
