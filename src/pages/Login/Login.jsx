import * as React from "react";
import { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  IconButton,
  InputAdornment,
  Link,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { baseUrl } from "../../components/constant/constant";
// adjust the import path if your constant.js is elsewhere:

export default function Login() {
  const [uuid, setUuid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await axios.post(`${baseUrl}/api/asian-paint/login`, {
        uuid: uuid.trim(),
      });
      if (!res.data?.user) throw new Error("Invalid response");
      login(res.data.user); // persists to localStorage
      navigate("/"); // go wherever after login
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 404
          ? "UID not found. Please register."
          : "Login failed");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container
      maxWidth="xs"
      sx={{ display: "grid", placeItems: "center", minHeight: "100vh" }}
    >
      <Paper elevation={0} sx={{ p: 2, width: "100%" }}>
        <Typography variant="h4" align="center" fontWeight={800} gutterBottom>
          Log In
        </Typography>

        <Box component="form" onSubmit={onSubmit} sx={{ mt: 2 }}>
          <TextField
            label="Mobile No :"
            name="uuid"
            value={uuid}
            onChange={(e) => setUuid(e.target.value)}
            variant="standard"
            fullWidth
            required
            sx={{ mb: 3 }}
          />

          {/* <Box sx={{ mt: 1 }}>
            <Link component="button" type="button"  underline="hover">
              Register
            </Link>
          </Box> */}

          {error && (
            <Typography color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}

          <Button
            type="submit"
            fullWidth
            variant="outlined"
            sx={{ mt: 4, fontWeight: 700 }}
            disabled={submitting}
          >
            Submit
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
