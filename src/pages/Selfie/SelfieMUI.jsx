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

// Desired final image size (portrait)
const OUTPUT_WIDTH = 720; // px
const OUTPUT_HEIGHT = 1280; // px

// Transparent overlay PNG served from public/
const FRAME_SRC = "/frame/frame2.png"; // ensure this image is 9:16 to avoid cropping

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
  const [videoKey, setVideoKey] = useState(0); // force <video> remount on restart (Safari fix)

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
      // fully reset for Safari
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
        if (videoRef.current.readyState < 1)
          await waitEvent(videoRef.current, "loadedmetadata");
        if (videoRef.current.readyState < 3)
          await waitEvent(videoRef.current, "canplay");
        try {
          await videoRef.current.play();
        } catch {}
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
        const alive = streamRef.current
          ?.getVideoTracks?.()
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

  // Draw a source image into a target rect with "cover" crop (no stretch)
  const drawCover = (ctx, img, dx, dy, dW, dH, mirror = false) => {
    const iW = img.videoWidth || img.naturalWidth || img.width;
    const iH = img.videoHeight || img.naturalHeight || img.height;
    const srcRatio = iW / iH;
    const dstRatio = dW / dH;

    let sW, sH, sX, sY;
    if (srcRatio > dstRatio) {
      // source wider -> crop left/right
      sH = iH;
      sW = Math.round(iH * dstRatio);
      sX = Math.floor((iW - sW) / 2);
      sY = 0;
    } else {
      // source taller -> crop top/bottom
      sW = iW;
      sH = Math.round(iW / dstRatio);
      sX = 0;
      sY = Math.floor((iH - sH) / 2);
    }

    if (mirror) {
      ctx.save();
      ctx.translate(dx + dW, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sX, sY, sW, sH, 0, 0, dW, dH);
      ctx.restore();
    } else {
      ctx.drawImage(img, sX, sY, sW, sH, dx, dy, dW, dH);
    }
  };

  const capture = async () => {
    if (!videoRef.current) return;
    const v = videoRef.current;

    // Prepare canvas at exact output size (portrait 720x1280)
    const canvas = canvasRef.current;
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext("2d");

    // Fill black background (in case of any transparent overlay regions)
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    // Draw video to canvas with cover crop and optional mirror
    drawCover(ctx, v, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT, isSelfie);

    // Draw overlay frame without stretching (cover to fill)
    if (FRAME_SRC) {
      try {
        const frame = await loadImage(FRAME_SRC);
        drawCover(ctx, frame, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT, false);
      } catch {
        // ignore overlay load errors
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
        minHeight: "100dvh",
        bgcolor: "background.default",
        // London-themed subtle glow
        backgroundImage:
          "radial-gradient(60rem 60rem at -20% -10%, rgba(225,29,46,0.10), transparent), radial-gradient(40rem 40rem at 120% 110%, rgba(19,81,163,0.12), transparent)",
        py: { xs: 1.5, md: 3 },
      }}
    >
      {/* Home (top-right) */}
      <IconButton
        aria-label="Home"
        onClick={() => navigate("/")}
        sx={{ position: "fixed", top: 60, right: 12, zIndex: 100 }}
      >
        <HomeIcon sx={{ fontSize: "28px" }} />
      </IconButton>

      {/* <Grid container justifyContent="center" sx={{ px: "12px" }}>
        <Grid item xs={12} md={10} lg={8}>
          <Card elevation={6}>
            <CardHeader
              title={
                <Typography sx={{ fontSize: { xs: "1rem", md: "1.2rem" }, fontWeight: 800 }}>
                  Selfie Booth
                </Typography>
              }
            /> */}

      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          minHeight: { xs: "calc(100dvh - 100px)", md: "calc(100dvh - 120px)" },
        }}
      >
        <Grid container spacing={2} sx={{ justifyContent: "center" }}>
          <Grid item xs={12}>
            <Paper
              elevation={3}
              sx={{
                position: "relative",
                aspectRatio: `${OUTPUT_WIDTH} / ${OUTPUT_HEIGHT}`,
                width: "100%",
                // Keep camera view within viewport height on desktop to avoid scroll
                maxWidth: {
                  xs: 360,
                  sm: 420,
                  md: "min(480px, calc((100dvh - 260px) * 0.5625))", // account for extra top margin
                },
                mt: { xs: 1, md: 2 },
                mb: "40px", // keep camera 40px from the bottom
                mx: "auto",
                overflow: "hidden",
                borderRadius: 2,
                bgcolor: "#000",
              }}
            >
              {/* Subtle animated edge glow for interactivity */}
              <Box
                sx={{
                  pointerEvents: "none",
                  position: "absolute",
                  inset: 0,
                  borderRadius: 2,
                  boxShadow:
                    "inset 0 0 0 2px rgba(255,255,255,0.06), 0 0 0 3px rgba(225,29,46,0.15), 0 0 0 6px rgba(19,81,163,0.10)",
                }}
              />
              {/* Camera / Photo */}
              {!captured ? (
                <video
                  key={videoKey}
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
                  onClick={() => videoRef.current?.play?.().catch(() => {})}
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

              {/* Live overlay (no stretch). Use cover so it fills the frame */}
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

              {/* Guidance text */}
              {!captured && (
                <Typography
                  variant="caption"
                  sx={{
                    position: "absolute",
                    left: 12,
                    bottom: 80,
                    bgcolor: "rgba(0,0,0,0.35)",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  Align your face within the frame
                </Typography>
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

              {/* Retry stream */}
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
                    width: 56,
                    height: 56,
                    minWidth: 56,
                    p: 0,
                    bgcolor: "rgba(0,0,0,0.4)",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.45)",
                    transition: "transform 80ms ease",
                    "&:active": { transform: "translateX(-50%) scale(0.96)" },
                  }}
                >
                  <CameraAltIcon sx={{ fontSize: 28, color: "#fff" }} />
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
                  Tip: If the download button doesn't prompt, long-press the
                  photo and choose "Save Image".
                </Typography>
              )}
            </Grid>
          )}
        </Grid>
      </CardContent>
      {/* </Card>
        </Grid>
      </Grid> */}

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
