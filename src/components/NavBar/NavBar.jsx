import * as React from "react";
import { AppBar, Toolbar, Button, Box } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/Logo.png";
import { useNavigate } from "react-router-dom";

export default function NavBar() {
  const { user, isAuthed, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = () => {
    logout();
    navigate("/"); // redirect after logout
  };
  if (!isAuthed) return null;

  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
      enableColorOnDark
      sx={{
        top: 0,
        zIndex: (t) => t.zIndex.appBar + 1,
        bgcolor: "rgba(6,11,43,0.72)",
        backdropFilter: "saturate(180%) blur(8px)",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
        <Box
          sx={{
            fontWeight: 700,
            display: { xs: "none", sm: "none", md: "block" },
          }}
        >
          {user?.name || user?.uuid}
        </Box>
        <Box
          component="img"
          src={logo}
          alt="Asian Paints"
          sx={{ height: { xs: 50, sm: 70, md: 65 }, p: 1.2 }}
        />
        <Button variant="outlined" onClick={onLogout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
}
