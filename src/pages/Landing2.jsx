import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";

import gridBG from "../assets/GridBG.png";
import logo from "../assets/Logo.png";
import title from "../assets/Title.png";
import hand from "../assets/Hand-with-console.png";
import startBtn from "../assets/Button.png";
import { useState } from "react";
import Register from "./Register/Register";
import Login from "./Login/Login";

export default function Landing2() {
  const [showRegister, setShowRegister] = useState(false);
  console.log("showRegister", showRegister);
  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundImage: `url(${gridBG})`,
        backgroundSize: { xs: "cover", sm: "cover", md: "100% 100%" },
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Top Logo */}
      <Box
        sx={{ py: { xs: 2, sm: 3 }, display: "flex", justifyContent: "center" }}
      >
        <Box
          component="img"
          src={logo}
          alt="Asian Paints"
          sx={{
            height: { xs: 65, sm: 70, md: 90 },

            p: 1.2,
          }}
        />
      </Box>
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          position: "absolute",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {!showRegister && (
          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              width: { xs: 260, sm: 400, md: 550 },
              height: { xs: 260, sm: 400, md: 550 },
              borderRadius: "50%",
              bgcolor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 30px 60px rgba(0,0,0,.45)",
            }}
          >
            {/* Title */}
            <Box
              component="img"
              src={title}
              alt="The Masters"
              sx={{
                position: "absolute",
                top: { xs: 26, sm: 33, md: 36 },
                width: { xs: "50%", sm: "55%", md: "45%" },
                left: "50%",
                transform: "translateX(-50%)",
              }}
            />
            {/* Hand with console */}

            <Box
              component="img"
              src={hand}
              alt="Controller Hand"
              sx={{
                position: "absolute",
                bottom: "-4%",
                left: { xs: "10", sm: "10%", md: "8%" },
                width: { xs: "72%", sm: "70%", md: "75%" },
                transform: "translateY(10%)",
                // filter: "drop-shadow(0 12px 24px rgba(0,0,0,.35))",
              }}
            />
            <Box
              component="img"
              src={startBtn}
              alt="Controller Hand"
              onClick={() => setShowRegister(true)}
              sx={{
                position: "absolute",
                bottom: { xs: "-25%", sm: "-21%", md: "-14%" },
                minWidth: { xs: 140, sm: 200 },
                height: { xs: 65, sm: 86 },
                transform: "translateY(10%)",
                "&:hover": { transform: "scale(1.01)" },
                transition: "0.18s ease",
                // filter: "drop-shadow(0 12px 24px rgba(0,0,0,.35))",
              }}
            />
          </Box>
        )}
        {showRegister && <Login />}
      </Box>
    </Box>
  );
}
