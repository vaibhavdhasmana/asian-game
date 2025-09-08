import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
function PrivateRoute({ children }) {
  const { isAuthed } = useAuth();
  console.log("isAuth:", isAuthed);
  return isAuthed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <NavBar />
      {/* <Toolbar /> */}
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* <Route path="/quiz" element={<QuizMUI />} /> */}
        <Route path="/game" element={<CrosswordMUI />} />
        <Route path="/login" element={<Login />} />
        <Route path="/selfie" element={<SelfieMUI />} />
        <Route path="/crossword" element={<CrossWordNew />} />

        <Route path="/ap-admin/setting" element={<AdminSettings />} />
        <Route
          path="/wordSearch"
          element={
            <PrivateRoute>
              <WordSearchMUI />
            </PrivateRoute>
          }
        />
        <Route
          path="/play"
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
    </>
  );
}
