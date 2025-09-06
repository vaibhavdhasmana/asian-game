import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { AuthProvider } from "./context/AuthContext";
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#5ad0ff" },
    secondary: { main: "#ff3df1" },
    background: { default: "#060b2b", paper: "#0a0f3a" },
  },
  shape: { borderRadius: 16 },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
  //   <ThemeProvider theme={theme}>
  //     <CssBaseline />
  //     <BrowserRouter>
  //       <App />
  //     </BrowserRouter>
  //   </ThemeProvider>
  // </React.StrictMode>
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);
