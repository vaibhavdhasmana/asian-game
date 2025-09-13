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
  Divider,
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
        // Validate Indian mobile for login as well
        const normalizeMobile = (val) => {
          const digits = String(val || "").replace(/\D/g, "");
          const ten = digits.length > 10 ? digits.slice(-10) : digits;
          return /^[6-9]\d{9}$/.test(ten) ? ten : null;
        };
        const mobile = normalizeMobile(uuid);
        if (!mobile)
          throw new Error(
            "Enter a valid Indian mobile number (10 digits starting with 6-9)."
          );
        const res = await axios.post(`${baseUrl}/api/asian-paint/login`, {
          uuid: mobile,
        });
        if (!res.data?.user) throw new Error("Invalid response");
        login(res.data.user);

        resetForm();
        onClose?.();
      } else {
        // Registration: validate Indian mobile number in UUID field
        const normalizeMobile = (val) => {
          const digits = String(val || "").replace(/\D/g, "");
          const ten = digits.length > 10 ? digits.slice(-10) : digits;
          return /^[6-9]\d{9}$/.test(ten) ? ten : null;
        };
        const mobile = normalizeMobile(uuid);
        if (!name.trim()) throw new Error("Name is required.");
        if (!mobile)
          throw new Error(
            "Please enter a valid Indian mobile number (10 digits starting with 6-9)."
          );
        const payload = { name: name.trim(), uuid: mobile };
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
          ? "This Mobile no. is already registered."
          : err.response?.status === 404
          ? "User is not found. Please register."
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
                  label="Mobile No :"
                  variant="standard"
                  fullWidth
                  required
                  value={uuid}
                  onChange={(e) => setUuid(e.target.value)}
                />

                {view === "login" && (
                  <Box sx={{ mt: 2 }}>
                    <Typography fontSize={"16px"} fontWeight={400}>
                      New here? Click Register to continue.
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 2 }}>
                  {view === "login" ? (
                    <Button
                      component="button"
                      type="button"
                      variant="outlined"
                      underline="hover"
                      sx={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#ba68c8",
                      }}
                      onClick={() => {
                        if (!loading) {
                          setError(null);
                          setView("register");
                          onSwitch?.("register");
                          resetForm();
                        }
                      }}
                    >
                      Register Here
                    </Button>
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
                  sx={{
                    fontSize: "18px",
                    mt: 4,
                    fontWeight: 700,
                    color: "#ba68c8",
                  }}
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
