// src/pages/Register.jsx
import * as React from "react";
import { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { baseUrl } from "../../components/constant/constant";
import { useNavigate } from "react-router-dom";
export default function Register({ setShowRegister }) {
  const [formData, setFormData] = useState({ name: "", uniqueNo: "" });
  const [loginFormData, setLoginFormData] = useState({ uniqueNo: "" });
  const [login, setLogin] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleChange2 = (e) => {
    const { name, value } = e.target;
    setLoginFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.name && formData.uniqueNo) {
      const normalizeMobile = (val) => {
        const digits = String(val || "").replace(/\D/g, "");
        const ten = digits.length > 10 ? digits.slice(-10) : digits;
        return /^[6-9]\d{9}$/.test(ten) ? ten : null;
      };
      const mobile = normalizeMobile(formData.uniqueNo);
      if (!mobile) {
        setErrorMsg(
          "Please enter a valid Indian mobile number (10 digits starting with 6-9)."
        );
        return;
      }
      const response = await axios.post(`${baseUrl}/api/asian-paint/register`, {
        name: formData.name.trim(),
        uuid: mobile,
      });
      if (response.status === 201) {
        if (response?.data?.statusCode === 400) {
          setErrorMsg("Already Register");
        }
      }
      if (response?.data?.statusCode === 200) {
        setSubmitted(true);
      }
      // const res = await fetch("/.netlify/functions/register", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     name: formData.name.trim(),
      //     uniqueNo: formData.uniqueNo.trim(),
      //   }),
      // });
      console.log("res:", response);
    }
  };
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
  };

  if (submitted) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            Thank you,
          </Typography>
          <Typography variant="body1" mb={2}>
            {formData.name}!
          </Typography>
          <Typography variant="body1">
            Your registration with us <b>{formData.uniqueNo}</b> has been
            received.
          </Typography>
          <Button
            variant="outlined"
            sx={{ mt: 3 }}
            onClick={() => {
              if (typeof setShowRegister === "function") setShowRegister(false);
              else navigate("/");
            }}
          >
            Ok
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <>
      <Paper
        sx={{
          px: { xs: 2, md: 4 },
          py: { xs: 4, md: 6 },
          width: { xs: "80%", md: "28%" },
          position: "relative",
        }}
      >
        <CloseIcon
          sx={{
            position: "absolute",
            top: "10px",
            right: "10px",
            color: "white",
            cursor: "pointer",
            "&:hover": { transform: "scale(1.1)" },
          }}
          onClick={() => {
            if (typeof setShowRegister === "function") setShowRegister(false);
            else navigate("/");
          }}
        />

        {!login && (
          <>
            <Box>
              <Typography variant="h5" mb={2} gutterBottom>
                Register
              </Typography>
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <TextField
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  fullWidth
                />
                <TextField
                  label="Mobile No."
                  name="uniqueNo"
                  value={formData.uniqueNo}
                  onChange={handleChange}
                  required
                  fullWidth
                  inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                    maxLength: 13,
                  }}
                  placeholder="10-digit Indian mobile number"
                />
                {errorMsg && (
                  <Typography variant="body1" color="error">
                    {errorMsg}
                  </Typography>
                )}
                <Button type="submit" variant="contained" size="large">
                  Submit
                </Button>
              </Box>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="body"
              sx={{ textAlign: "center" }}
              gutterBottom
            >
              Or Already Register!
            </Typography>
            <Box>
              <Typography
                mt={"12px"}
                sx={{
                  fontSize: "14px",
                  fontWeight: "400",
                  textDecoration: "underline",
                }}
                gutterBottom
                onClick={() => setLogin(true)}
              >
                Login Here
              </Typography>
            </Box>
          </>
        )}
        {login && (
          <>
            <Box>
              <Typography variant="h5" mb={2} gutterBottom>
                Login
              </Typography>
              <Box
                component="form"
                onSubmit={handleLoginSubmit}
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <TextField
                  label="Mobile"
                  name="uniqueNo"
                  value={loginFormData.uniqueNo}
                  onChange={handleChange2}
                  required
                  fullWidth
                />
                {errorMsg && (
                  <Typography variant="body1" color="error">
                    {errorMsg}
                  </Typography>
                )}
                <Button type="submit" variant="contained" size="large">
                  Submit
                </Button>
              </Box>
            </Box>
            {/* const navigate = useNavigate(); */}
          </>
        )}
      </Paper>
    </>
  );
}
