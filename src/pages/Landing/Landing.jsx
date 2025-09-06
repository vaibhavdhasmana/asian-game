import * as React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

// assets
import gridBG from "../../assets/GridBG.png";
import logo from "../../assets/Logo.png";
import title from "../../assets/Title.png";
import hand from "../../assets/Hand-with-console.png";
import startBtn from "../../assets/Button.png";

// components
import AuthPanel from "../AuthPannel/AuthPanel";

import StartHero from "../../components/landing/StartHero";
import FullScreenStage from "../../components/landing/FullScreenStage";
import LogoBar from "../../components/landing/LogoBar";
import GameDashboard from "./GameDashboard";

export default function Landing() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const { isAuthed } = useAuth();

  // Auto-close auth panel on successful auth
  useEffect(() => {
    if (isAuthed && showAuth) setShowAuth(false);
  }, [isAuthed, showAuth]);

  return (
    <FullScreenStage background={gridBG} isAuthed={isAuthed}>
      {/* Top logo only when not authenticated */}
      <LogoBar logoSrc={logo} hidden={isAuthed} />

      {/* Start circle (hidden when auth panel is open OR user is authed) */}
      <StartHero
        visible={!showAuth && !isAuthed}
        titleSrc={title}
        handSrc={hand}
        startSrc={startBtn}
        onStart={() => {
          setAuthMode("login");
          setShowAuth(true);
        }}
      />
      {isAuthed && <GameDashboard />}
      {/* Auth overlay (login/register) */}
      <AuthPanel
        open={showAuth}
        mode={authMode}
        onClose={() => setShowAuth(false)}
        onSwitch={(m) => setAuthMode(m)}
      />
    </FullScreenStage>
  );
}
