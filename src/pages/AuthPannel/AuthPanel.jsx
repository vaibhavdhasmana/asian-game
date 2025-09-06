import * as React from "react";
import { useState } from "react";
import {
  Box,
  Paper,
  Container,
  Typography,
  TextField,
  Button,
  Link,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { baseUrl } from "../../components/constant/constant";
import useAsync from "../../hooks/useAsync";
import LoadingButton from "../../components/common/LoadingButton";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import LinearLoader from "../../components/common/LinearLoader";
// import { useAuth } from "../context/AuthContext";
// 🔁 adjust this import if your constant.js lives elsewhere
// import { baseUrl } from "../components/constant/constant";
export default function AuthPanel({ open, mode = "login", onClose, onSwitch }) {
  const [view, setView] = useState(mode); // "login" | "register"
  const [name, setName] = useState("");
  const [uuid, setUuid] = useState("");
  //   const [loading, setLoading] = useState(false);
  //   const [err, setErr] = useState("");
  const { login } = useAuth();

  React.useEffect(() => {
    setView(mode);
  }, [mode]);
  //   if (!open) return null;
  const { loading, error, run, setError } = useAsync();
  const resetForm = React.useCallback(() => {
    setName("");
    setUuid("");
    setView("login"); // back to login next time it opens
    setError(null);
  }, [setError]);
  const submit = (e) => {
    e.preventDefault();
    setError(null);

    run(async () => {
      if (view === "login") {
        const res = await axios.post(`${baseUrl}/api/asian-paint/login`, {
          uuid: uuid.trim(),
        });
        if (!res.data?.user) throw new Error("Invalid response");
        login(res.data.user);

        resetForm();
        onClose?.();
      } else {
        const payload = { name: name.trim(), uuid: uuid.trim() };
        if (!payload.name || !payload.uuid)
          throw new Error("Name and UID are required.");
        const res = await axios.post(
          `${baseUrl}/api/asian-paint/register`,
          payload
        );
        if (!(res.status === 201 || res.data?.user))
          throw new Error("Registration failed");
        // Optional: consider user logged in immediately after register

        login(res.data.user || payload);
        resetForm();
        onClose?.();
      }
    }).catch((err) => {
      const m =
        err.response?.data?.message ||
        (err.response?.status === 409
          ? "This UID is already registered."
          : err.response?.status === 404
          ? "UID not found. Please register."
          : err.message || "Something went wrong.");
      setError(m);
    });
  };

  const handleClose = () => {
    if (loading) return; // block close while loading
    resetForm();
    onClose?.();
  };
  return (
    <>
      <LoadingOverlay open={loading} label="Processing..." />
      {open && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            display: "grid",
            placeItems: "center",
            bgcolor: "rgba(0,0,0,.5)",
          }}
          onClick={(e) => {
            if (!loading && e.target === e.currentTarget) onClose?.();
          }}
        >
          <Container maxWidth="xs">
            <Paper
              elevation={6}
              sx={{ p: 3, pt: 4, position: "relative", overflow: "hidden" }}
            >
              <LinearLoader show={loading} />
              <IconButton
                onClick={handleClose}
                size="small"
                sx={{ position: "absolute", top: 8, right: 8 }}
                disabled={loading}
              >
                <CloseIcon />
              </IconButton>

              <Typography
                variant="h4"
                align="center"
                fontWeight={800}
                gutterBottom
              >
                {view === "login" ? "Log In" : "Register"}
              </Typography>

              <Box component="form" onSubmit={submit} sx={{ mt: 2 }}>
                {view === "register" && (
                  <TextField
                    label="Name :"
                    variant="standard"
                    fullWidth
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    sx={{ mb: 3 }}
                    disabled={loading}
                  />
                )}

                <TextField
                  label="UID No :"
                  variant="standard"
                  fullWidth
                  required
                  value={uuid}
                  onChange={(e) => setUuid(e.target.value)}
                />

                <Box sx={{ mt: 2 }}>
                  {view === "login" ? (
                    <Link
                      component="button"
                      type="button"
                      underline="hover"
                      onClick={() => {
                        if (!loading) {
                          setError(null);
                          setView("register");
                          onSwitch?.("register");
                          resetForm();
                        }
                      }}
                    >
                      Register
                    </Link>
                  ) : (
                    <Link
                      component="button"
                      type="button"
                      underline="hover"
                      onClick={() => {
                        if (!loading) {
                          setError(null);
                          setView("login");
                          onSwitch?.("login");
                          resetForm();
                        }
                      }}
                    >
                      Back to Login
                    </Link>
                  )}
                </Box>

                {error && (
                  <Typography color="error" sx={{ mt: 1 }}>
                    {String(error?.message || error)}
                  </Typography>
                )}

                {/* <Button
              type="submit"
              fullWidth
              variant="outlined"
              color="secondary" // purple outline like your mock
              sx={{ mt: 4, fontWeight: 700 }}
              disabled={loading}
            >
              {view === "login" ? "Submit" : "Register"}
            </Button> */}
                <LoadingButton
                  loading={loading}
                  loadingLabel="Please wait..."
                  type="submit"
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  sx={{ mt: 4, fontWeight: 700 }}
                >
                  {view === "login" ? "Submit" : "Register"}
                </LoadingButton>
              </Box>
            </Paper>
          </Container>
        </Box>
      )}
    </>
  );
}
