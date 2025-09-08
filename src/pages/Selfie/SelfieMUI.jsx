// src/pages/Selfie/SelfieMUI.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  Button,
  Chip,
  Paper,
  Alert,
  Snackbar,
  IconButton,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CachedIcon from "@mui/icons-material/Cached";
import DownloadIcon from "@mui/icons-material/Download";
import FlipCameraAndroidIcon from "@mui/icons-material/FlipCameraAndroid";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router-dom";

const MAX_CAPTURE_WIDTH = 1280; // clamp output size to keep files small

export default function SelfieMUI() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState(null); // dataURL
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const isSelfie = facingMode === "user";

  const startStream = async (mode = facingMode) => {
    try {
      stopStream();
      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
          setReady(true);
        };
      }
    } catch (err) {
      setSnack({
        open: true,
        message:
          "Camera not available. Please allow access or try a different browser/device.",
        severity: "error",
      });
      setReady(false);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startStream();
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flipCamera = async () => {
    const next = isSelfie ? "environment" : "user";
    setFacingMode(next);
    setCaptured(null);
    setReady(false);
    await startStream(next);
  };

  const capture = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const vw = v.videoWidth || 1280;
    const vh = v.videoHeight || 720;

    const targetW = Math.min(vw, MAX_CAPTURE_WIDTH);
    const targetH = Math.round((vh / vw) * targetW);

    const canvas = canvasRef.current;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");

    if (isSelfie) {
      ctx.save();
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(v, 0, 0, targetW, targetH);
      ctx.restore();
    } else {
      ctx.drawImage(v, 0, 0, targetW, targetH);
    }

    const dataUrl = canvas.toDataURL("image/png");
    setCaptured(dataUrl);
    setSnack({ open: true, message: "Captured ✓", severity: "success" });
  };

  const retake = () => setCaptured(null);

  const download = () => {
    if (!captured) return;
    const a = document.createElement("a");
    const ts = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .replace("Z", "");
    a.href = captured;
    a.download = `selfie_${ts}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const iosHint =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: { xs: 2, md: 4 },
        mt: "50px",
      }}
    >
      {/* Home (top-right of screen) */}
      <IconButton
        aria-label="Home"
        onClick={() => navigate("/")}
        sx={{ position: "fixed", top: "10%", right: 12, zIndex: 100 }}
      >
        <HomeIcon />
      </IconButton>

      <Grid container justifyContent="center" sx={{ px: "12px" }}>
        <Grid item xs={12} md={10} lg={8}>
          <Card elevation={6}>
            <CardHeader
              title={
                <Typography
                  sx={{
                    fontSize: { xs: "1rem", md: "1.2rem" },
                    fontWeight: 800,
                  }}
                >
                  Selfie Booth
                </Typography>
              }
              subheader={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={isSelfie ? "Front camera" : "Back camera"}
                    size="small"
                  />
                  {!ready && <Chip label="Starting camera…" size="small" />}
                </Stack>
              }
            />

            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Paper
                    elevation={3}
                    sx={{
                      position: "relative",
                      aspectRatio: "3 / 4",
                      width: "100%",
                      maxWidth: 420,
                      mx: "auto",
                      overflow: "hidden",
                      borderRadius: 2,
                      bgcolor: "#000",
                    }}
                  >
                    {/* Camera / Photo */}
                    {!captured ? (
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transform: isSelfie ? "scaleX(-1)" : "none",
                          background: "#000",
                        }}
                      />
                    ) : (
                      <img
                        src={captured}
                        alt="Selfie preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    )}

                    {/* Hidden canvas used for capture/export */}
                    <canvas ref={canvasRef} style={{ display: "none" }} />

                    {/* Flip camera (left side, vertically centered) */}
                    {!captured && (
                      <IconButton
                        aria-label="Flip camera"
                        onClick={flipCamera}
                        sx={{
                          position: "absolute",
                          left: 8,
                          bottom: "-2%",
                          transform: "translateY(-50%)",
                          bgcolor: "rgba(0,0,0,0.35)",
                          color: "white",
                          "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
                        }}
                      >
                        <FlipCameraAndroidIcon />
                      </IconButton>
                    )}

                    {/* Capture (center-bottom overlay) */}
                    {!captured && (
                      <Button
                        variant="contained"
                        size="large"
                        onClick={capture}
                        disabled={!ready}
                        startIcon={<CameraAltIcon />}
                        sx={{
                          position: "absolute",
                          left: "50%",
                          bottom: 12,
                          transform: "translateX(-50%)",
                          borderRadius: "999px",
                          px: 3,
                          py: 1.2,
                          boxShadow: 3,
                        }}
                      >
                        Capture
                      </Button>
                    )}
                  </Paper>
                </Grid>

                {/* Actions after capture */}
                {captured && (
                  <Grid item xs={12}>
                    <Stack
                      direction={{ xs: "row", sm: "row" }}
                      spacing={1.5}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={retake}
                        startIcon={<CachedIcon />}
                      >
                        Retake
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={download}
                        startIcon={<DownloadIcon />}
                      >
                        Download
                      </Button>
                    </Stack>

                    {iosHint && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                        sx={{ mt: 1 }}
                      >
                        Tip: If the download button doesn’t prompt, long-press
                        the photo and choose “Save Image”.
                      </Typography>
                    )}
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={1500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert
          variant="filled"
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
