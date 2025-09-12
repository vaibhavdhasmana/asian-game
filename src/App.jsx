import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import londonTheme from "./theme/londonTheme";
// import Landing from "./pages/Landing2";
import NotFound from "./pages/NotFound";
import Placeholder from "./pages/Placeholder";
import Register from "./pages/Register/Register";
import Crossword from "./pages/Crossword/Crossword";
import CrosswordMUI from "./pages/Crossword/CrosswordMUI";
import QuizMUI from "./pages/QuizGame/QuizMUI";
import Login from "./pages/Login/Login";
import NavBar from "./components/NavBar/NavBar";
import Landing from "./pages/Landing/Landing";
import { Toolbar } from "@mui/material";
import AdminSettings from "./pages/Admin/AdminSettings";
import WordSearchMUI from "./pages/WordSearch/WordSearchMUI";
import { useAuth } from "./context/AuthContext";
import SelfieMUI from "./pages/Selfie/SelfieMUI";
import CrossWordNew from "./pages/Crossword/CrossWordNew";
import JigsawMUI from "./pages/Jigsaw/JigsawMUI";
import JigsawMUI2 from "./pages/Jigsaw/JigsawMUI2";
import WordSearch2 from "./pages/WordSearch/WorldSearch2";
import CameraTest from "./pages/Selfie/CameraTest";
function PrivateRoute({ children }) {
  const { isAuthed } = useAuth();
  console.log("isAuth:", isAuthed);
  return isAuthed ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, isAuthed } = useAuth();
  const ok = isAuthed && !!user?.isAdmin;
  return ok ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={londonTheme}>
      <CssBaseline />
      <NavBar />
      {/* <Toolbar /> */}
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* <Route path="/quiz" element={<QuizMUI />} /> */}
        <Route path="/login" element={<Login />} />
        <Route path="/selfie" element={<SelfieMUI />} />
        <Route path="/register" element={<Register />} />
        <Route path="/crossword" element={<CrossWordNew />} />
        <Route path="/jigsaw2" element={<JigsawMUI2 />} />
        <Route path="/test/jigsaw2" element={<JigsawMUI />} />
        <Route path="/test/word-search2" element={<WordSearch2 />} />
        <Route path="/test/camera-test" element={<CameraTest />} />
        <Route path="/check" element={<AdminSettings />} />
        <Route
          path="/ap-admin/setting"
          element={
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          }
        />
        <Route path="/wordSearch" element={<WordSearchMUI />} />
        <Route
          path="/JigsawMUI2"
          element={<Placeholder title="Game Screen (Coming Soon)" />}
        />
        <Route path="/lead" element={<Placeholder title="About Event" />} />
        <Route path="/sponsors" element={<Placeholder title="Sponsors" />} />
        <Route path="/start" element={<Navigate to="/play" replace />} />
        <Route
          path="/quiz"
          element={
            <PrivateRoute>
              <QuizMUI />
            </PrivateRoute>
          }
        />
        <Route
          path="/game"
          element={
            <PrivateRoute>
              <CrosswordMUI />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ThemeProvider>
  );
}
