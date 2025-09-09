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
import ReplayIcon from "@mui/icons-material/Replay";
import { useNavigate } from "react-router-dom";
// import frame1 from "./";
const MAX_CAPTURE_WIDTH = 1280;

// Replace with your single transparent 3:4 frame PNG (public/ or CDN)
const FRAME_SRC = "/frame/frame2.png"; // e.g. public/frames/my-frame.png

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
  const [videoKey, setVideoKey] = useState(0); // force <video> remount on restart

  const isSelfie = facingMode === "user";

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
      videoRef.current.srcObject = null;
      // Safari needs both of these to truly reset
      videoRef.current.removeAttribute("src");
      videoRef.current.load?.();
    }
  };

  const waitEvent = (el, evt) =>
    new Promise((res) => {
      const once = () => {
        el.removeEventListener(evt, once);
        res();
      };
      el.addEventListener(evt, once, { once: true });
    });

  const startStream = async (mode = facingMode) => {
    try {
      setReady(false);
      stopStream();
      // force <video> remount so Safari drops stale decoder
      setVideoKey((k) => k + 1);

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

      // Wait for the new <video> to mount
      await new Promise((r) => setTimeout(r, 0));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for metadata and actual canplay before showing UI as ready
        if (videoRef.current.readyState < 1) {
          await waitEvent(videoRef.current, "loadedmetadata");
        }
        // Some browsers need this extra wait to avoid black frame
        if (videoRef.current.readyState < 3) {
          await waitEvent(videoRef.current, "canplay");
        }

        // Don't rely on autoplay; user gesture (buttons) will also call play()
        try {
          await videoRef.current.play();
        } catch {
          // ignored – iOS may require explicit user gesture
        }

        setReady(true);
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

  useEffect(() => {
    startStream();
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If app is backgrounded and returns, some browsers kill tracks: auto-restart
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && !captured) {
        const alive =
          streamRef.current &&
          streamRef.current
            .getVideoTracks()
            .some((t) => t.readyState === "live");
        if (!alive) startStream();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captured, facingMode]);

  const flipCamera = async () => {
    const next = isSelfie ? "environment" : "user";
    setFacingMode(next);
    setCaptured(null);
    await startStream(next);
  };

  const retake = async () => {
    setCaptured(null);
    await startStream(facingMode);
  };

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const capture = async () => {
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

    // Draw video (mirror if selfie)
    if (isSelfie) {
      ctx.save();
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(v, 0, 0, targetW, targetH);
      ctx.restore();
    } else {
      ctx.drawImage(v, 0, 0, targetW, targetH);
    }

    // Single overlay frame
    if (FRAME_SRC) {
      try {
        const frame = await loadImage(FRAME_SRC);
        ctx.drawImage(frame, 0, 0, targetW, targetH);
      } catch {
        // ignore frame load failure
      }
    }

    const dataUrl = canvas.toDataURL("image/png");
    setCaptured(dataUrl);
    setSnack({ open: true, message: "Captured ✓", severity: "success" });
  };

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
      {/* Home (top-right) */}
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
              // subheader={
              //   <Stack direction="row" spacing={1} alignItems="center">
              //     <Chip
              //       label={isSelfie ? "Front camera" : "Back camera"}
              //       size="small"
              //     />
              //     {!ready && <Chip label="Starting camera…" size="small" />}
              //   </Stack>
              // }
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
                        key={videoKey} // <—— forces re-mount on restart
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
                          display: "block",
                        }}
                        onClick={() => {
                          // extra play() attempt via explicit gesture (iOS)
                          videoRef.current?.play?.().catch(() => {});
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

                    {/* Live single overlay */}
                    {FRAME_SRC && (
                      <img
                        src={FRAME_SRC}
                        alt="Frame"
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                        crossOrigin="anonymous"
                      />
                    )}

                    {/* Hidden canvas used for capture/export */}
                    <canvas ref={canvasRef} style={{ display: "none" }} />

                    {/* Flip camera */}
                    {!captured && (
                      <IconButton
                        aria-label="Flip camera"
                        onClick={flipCamera}
                        sx={{
                          position: "absolute",
                          left: 8,
                          bottom: 15,
                          bgcolor: "rgba(0,0,0,0.35)",
                          color: "white",
                          "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
                        }}
                      >
                        <FlipCameraAndroidIcon />
                      </IconButton>
                    )}

                    {/* Retry stream (if permission blocked / iOS stalls) */}
                    {!captured && !ready && (
                      <IconButton
                        aria-label="Retry"
                        onClick={() => startStream()}
                        sx={{
                          position: "absolute",
                          left: 8,
                          bottom: 4,
                          bgcolor: "rgba(0,0,0,0.35)",
                          color: "white",
                          "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
                        }}
                      >
                        <ReplayIcon />
                      </IconButton>
                    )}

                    {/* Capture */}
                    {!captured && (
                      <Button
                        variant="contained"
                        size="large"
                        onClick={capture}
                        disabled={!ready}
                        sx={{
                          position: "absolute",
                          left: "50%",
                          bottom: 12,
                          transform: "translateX(-50%)",
                          borderRadius: "50%",
                          px: 3,
                          py: 1.2,
                          boxShadow: 3,

                          width: "55px",
                          height: "50px",
                          bgcolor: "rgba(0,0,0,0.35)",
                        }}
                      >
                        <CameraAltIcon
                          sx={{ fontSize: "30px", color: "#fff", p: 0, m: 0 }}
                        />
                      </Button>
                    )}
                  </Paper>
                </Grid>

                {/* Actions after capture */}
                {captured && (
                  <Grid item xs={12}>
                    <Stack
                      direction="row"
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
// src/pages/Selfie/SelfieMUI.jsx
// src/pages/Selfie/SelfieMUI.jsx
// src/pages/Selfie/SelfieMUI.jsx
// src/pages/Selfie/SelfieMUI.jsx
// src/pages/Selfie/SelfieMUI.jsx

// src/pages/Selfie/SelfieMUI.jsx
// src / pages / Selfie / SelfieMUI.jsx;
