// // QuizMUI.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import {
//   Box,
//   Card,
//   CardContent,
//   CardHeader,
//   Typography,
//   Button,
//   Stack,
//   Chip,
//   LinearProgress,
//   Grid,
//   Divider,
//   Paper,
// } from "@mui/material";
// import AccessTimeIcon from "@mui/icons-material/AccessTime";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import CancelIcon from "@mui/icons-material/Cancel";

// // =====================================================
// // CONFIG
// // =====================================================
// const TIMER_SECONDS = 30;

// // Add/modify questions here. Keep exactly 4 options per question.
// const QUESTIONS = [
//   {
//     id: 1,
//     question: "Asian Paints DécorPro helps customers with:",
//     options: [
//       "Waterproofing only",
//       "Paint shades only",
//       "Décor, furnishings & interior styling",
//       "Outdoor landscaping only",
//     ],
//     correctIndex: 2,
//     explanation:
//       "DécorPro offers integrated décor, furnishings, and interior styling services beyond just paint.",
//   },
//   {
//     id: 2,
//     question: "Which London landmark is home to the Crown Jewels?",
//     options: [
//       "Tower of London",
//       "Buckingham Palace",
//       "St. Paul’s Cathedral",
//       "Westminster Abbey",
//     ],
//     correctIndex: 0,
//     explanation:
//       "The Crown Jewels are housed in the Jewel House at the Tower of London.",
//   },
//   {
//     id: 3,
//     question: "London’s famous double-decker bus is traditionally what colour?",
//     options: ["Blue", "Yellow", "Red", "Green"],
//     correctIndex: 2,
//     explanation: "Red double-deckers are an iconic symbol of London.",
//   },
//   {
//     id: 4,
//     question: "DécorPro experts also provide guidance on:",
//     options: [
//       "Choosing wall finishes and textures",
//       "Buying new smartphones",
//       "Selecting cooking recipes",
//       "Hiring travel guides",
//     ],
//     correctIndex: 0,
//     explanation:
//       "DécorPro assists with selecting wall finishes, textures, and related interior choices.",
//   },
//   {
//     id: 5,
//     question: "The famous London Ferris wheel is called:",
//     options: ["Big Eye", "The Shard Wheel", "London Eye", "Tower Wheel"],
//     correctIndex: 2,
//     explanation:
//       "The London Eye is the city’s landmark observation wheel on the South Bank.",
//   },
// ];

// // (Optional) Shuffle questions once per mount
// function useShuffledQuestions(questions, shouldShuffle = false) {
//   return useMemo(() => {
//     if (!shouldShuffle) return questions;
//     const arr = [...questions];
//     for (let i = arr.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [arr[i], arr[j]] = [arr[j], arr[i]];
//     }
//     return arr;
//   }, [questions, shouldShuffle]);
// }

// // =====================================================
// // MAIN COMPONENT
// // =====================================================
// export default function QuizMUI() {
//   const quiz = useShuffledQuestions(QUESTIONS, false); // set true to shuffle
//   const [qIndex, setQIndex] = useState(0);
//   const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
//   const [selected, setSelected] = useState(null); // option index
//   const [locked, setLocked] = useState(false); // question is done (answer or timeout)
//   const [score, setScore] = useState(0);
//   const [status, setStatus] = useState(null); // "correct" | "wrong" | "timeout" | null
//   const [finished, setFinished] = useState(false);

//   const intervalRef = useRef(null);
//   const autoNextRef = useRef(null);

//   const current = quiz[qIndex];

//   // Start / reset timer each question
//   useEffect(() => {
//     clearInterval(intervalRef.current);
//     setSecondsLeft(TIMER_SECONDS);
//     setSelected(null);
//     setLocked(false);
//     setStatus(null);

//     intervalRef.current = setInterval(() => {
//       setSecondsLeft((s) => {
//         if (s <= 1) {
//           clearInterval(intervalRef.current);
//           // time's up -> lock & reveal
//           setLocked(true);
//           setStatus("timeout");
//           // auto-advance after a short delay (feel free to remove if you want manual only)
//           autoNextRef.current = setTimeout(() => {
//             handleNext();
//           }, 1200);
//           return 0;
//         }
//         return s - 1;
//       });
//     }, 1000);

//     return () => {
//       clearInterval(intervalRef.current);
//       clearTimeout(autoNextRef.current);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [qIndex]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       clearInterval(intervalRef.current);
//       clearTimeout(autoNextRef.current);
//     };
//   }, []);

//   const handleOptionClick = (idx) => {
//     if (locked) return;
//     setSelected(idx);
//     const isCorrect = idx === current.correctIndex;
//     setLocked(true);
//     setStatus(isCorrect ? "correct" : "wrong");
//     clearInterval(intervalRef.current);
//     if (isCorrect) setScore((s) => s + 1);
//   };

//   const handleNext = () => {
//     clearTimeout(autoNextRef.current);
//     if (qIndex + 1 < quiz.length) {
//       setQIndex((i) => i + 1);
//     } else {
//       // finish
//       setFinished(true);
//     }
//   };

//   const handleRestart = () => {
//     clearInterval(intervalRef.current);
//     clearTimeout(autoNextRef.current);
//     setQIndex(0);
//     setSecondsLeft(TIMER_SECONDS);
//     setSelected(null);
//     setLocked(false);
//     setScore(0);
//     setStatus(null);
//     setFinished(false);
//   };

//   const progressPct = (secondsLeft / TIMER_SECONDS) * 100;
//   const qNumber = qIndex + 1;

//   return (
//     <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
//       <Grid container justifyContent="center" px={"12px"} mt={"45px"}>
//         <Grid item xs={12} md={9} lg={8}>
//           <Stack spacing={2} alignItems="stretch">
//             <Typography
//               variant="body"
//               sx={{ fontSize: "1.5rem" }}
//               fontWeight={800}
//               align="center"
//               color="primary"
//             >
//               Quiz
//             </Typography>

//             {/* Header: Score, Progress, Timer */}
//             <Paper elevation={3} sx={{ p: 2 }}>
//               <Stack
//                 direction={{ xs: "column", sm: "row" }}
//                 spacing={2}
//                 alignItems={{ xs: "stretch", sm: "center" }}
//                 justifyContent="space-between"
//               >
//                 <Chip
//                   label={
//                     <Typography fontWeight={700}>
//                       Score:{" "}
//                       <Typography
//                         component="span"
//                         color="primary.main"
//                         fontWeight={800}
//                       >
//                         {score}
//                       </Typography>{" "}
//                       / {quiz.length}
//                     </Typography>
//                   }
//                   variant="outlined"
//                 />
//                 <Typography
//                   sx={{ fontSize: { xs: "1.2rem", md: "2rem" } }}
//                   fontWeight={700}
//                 >
//                   Question {qNumber} / {quiz.length}
//                 </Typography>
//                 {!finished && (
//                   <Chip
//                     icon={<AccessTimeIcon />}
//                     color={
//                       secondsLeft <= 5
//                         ? "error"
//                         : secondsLeft <= 10
//                         ? "warning"
//                         : "default"
//                     }
//                     label={`${secondsLeft}s`}
//                     sx={{ fontWeight: 700 }}
//                   />
//                 )}
//               </Stack>

//               {!finished && (
//                 <Box sx={{ mt: 2 }}>
//                   <LinearProgress
//                     variant="determinate"
//                     value={progressPct}
//                     sx={{ height: 8, borderRadius: 999 }}
//                   />
//                 </Box>
//               )}
//             </Paper>

//             {/* Body */}
//             {!finished ? (
//               <Card elevation={6}>
//                 <CardHeader
//                   title={
//                     <Typography
//                       sx={{ fontSize: { xs: "1.1rem", md: "2rem" } }}
//                       fontWeight={600}
//                     >
//                       {current.question}
//                     </Typography>
//                   }
//                   subheader={
//                     status === "timeout" ? (
//                       <Typography color="error">Time’s up!</Typography>
//                     ) : null
//                   }
//                 />
//                 <CardContent>
//                   <Stack spacing={1.5}>
//                     {current.options.map((opt, idx) => {
//                       const isCorrect = idx === current.correctIndex;
//                       const isSelected = idx === selected;

//                       // Styling logic
//                       let variant = "outlined";
//                       let color = "inherit";
//                       let startIcon = null;

//                       if (locked) {
//                         if (isCorrect) {
//                           variant = "contained";
//                           color = "success";
//                           startIcon = <CheckCircleIcon />;
//                         } else if (isSelected && !isCorrect) {
//                           variant = "contained";
//                           color = "error";
//                           startIcon = <CancelIcon />;
//                         } else {
//                           color = "inherit";
//                           variant = "outlined";
//                         }
//                       } else if (isSelected) {
//                         color = "primary";
//                         variant = "contained";
//                       }

//                       return (
//                         <Button
//                           key={idx}
//                           onClick={() => handleOptionClick(idx)}
//                           variant={variant}
//                           color={color}
//                           startIcon={startIcon}
//                           disabled={locked}
//                           sx={{
//                             justifyContent: "flex-start",
//                             textTransform: "none",
//                             fontWeight: 700,
//                             py: 1.25,
//                           }}
//                           fullWidth
//                         >
//                           <Box
//                             component="span"
//                             sx={{
//                               mr: 1.25,
//                               opacity: 0.7,
//                               fontWeight: 800,
//                               minWidth: 22,
//                               display: "inline-block",
//                             }}
//                           >
//                             {String.fromCharCode(65 + idx)}.
//                           </Box>
//                           {opt}
//                         </Button>
//                       );
//                     })}
//                   </Stack>

//                   {/* Feedback + Controls */}
//                   <Stack
//                     direction={{ xs: "row", sm: "row" }}
//                     spacing={2}
//                     alignItems={{ xs: "stretch", sm: "center" }}
//                     justifyContent="space-between"
//                     sx={{ mt: 3 }}
//                   >
//                     <Typography variant="body1">
//                       {locked && status === "correct" && (
//                         <Chip color="success" label="Correct!" />
//                       )}
//                       {locked && status === "wrong" && (
//                         <Chip color="error" label="Incorrect" />
//                       )}
//                       {locked && status === "timeout" && (
//                         <Chip color="error" label="Time’s up" />
//                       )}
//                     </Typography>

//                     <Stack direction="row" spacing={1.5}>
//                       {/* <Button
//                         variant="outlined"
//                         color="inherit"
//                         onClick={handleRestart}
//                       >
//                         Restart
//                       </Button> */}
//                       <Button
//                         variant="contained"
//                         onClick={handleNext}
//                         disabled={!locked}
//                       >
//                         {qIndex + 1 < quiz.length ? "Next" : "Finish"}
//                       </Button>
//                     </Stack>
//                   </Stack>

//                   {locked && current.explanation && (
//                     <>
//                       <Divider sx={{ my: 2 }} />
//                       <Typography variant="body2" color="text.secondary">
//                         <strong>Explanation:</strong> {current.explanation}
//                       </Typography>
//                     </>
//                   )}
//                 </CardContent>
//               </Card>
//             ) : (
//               // Results Screen
//               <Card elevation={6}>
//                 <CardContent>
//                   <Typography
//                     variant="h4"
//                     fontWeight={800}
//                     align="center"
//                     gutterBottom
//                   >
//                     Quiz Finished!
//                   </Typography>
//                   <Typography variant="h6" align="center" gutterBottom>
//                     You scored{" "}
//                     <Typography
//                       component="span"
//                       color="primary.main"
//                       fontWeight={800}
//                     >
//                       {score}
//                     </Typography>{" "}
//                     out of {quiz.length}
//                   </Typography>

//                   <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
//                     <Button variant="contained" onClick={handleRestart}>
//                       Play Again
//                     </Button>
//                   </Stack>

//                   <Box sx={{ mt: 3 }}>
//                     <Typography
//                       variant="subtitle1"
//                       fontWeight={700}
//                       gutterBottom
//                     >
//                       Review
//                     </Typography>
//                     {quiz.map((q, i) => (
//                       <Paper
//                         key={q.id}
//                         variant="outlined"
//                         sx={{ p: 1.5, mb: 1 }}
//                       >
//                         <Typography fontWeight={700}>
//                           {i + 1}. {q.question}
//                         </Typography>
//                         <Typography variant="body2" color="text.secondary">
//                           Correct answer: {q.options[q.correctIndex]}
//                         </Typography>
//                       </Paper>
//                     ))}
//                   </Box>
//                 </CardContent>
//               </Card>
//             )}
//           </Stack>
//         </Grid>
//       </Grid>
//     </Box>
//   );
// }
// src/pages/QuizGame/QuizMUI.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Stack,
  Chip,
  LinearProgress,
  Grid,
  Divider,
  Paper,
  Alert,
  Snackbar,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// =====================================================
// CONFIG
// =====================================================
const TIMER_SECONDS = 30;
const POINTS_PER_CORRECT = 10;
const USER_KEY = "ap_user";
const QUIZ_STATE_KEY = "ap_quiz_day1_state";
const QUIZ_DONE_KEY = "ap_quiz_day1_completed";

// Adjust to your env (mirrors your constant file)
const baseUrl =
  import.meta.env.VITE_APP_ENV === "local"
    ? "http://localhost:7000"
    : "https://api.nivabupalaunchevent.com";

// Questions (4 options each)
const QUESTIONS = [
  {
    id: 1,
    question: "London's river is called…",
    options: ["Severn", "Thames", "Mersey", "Tyne"],
    correctIndex: 1,
    explanation: "The River Thames flows through London.",
  },
  {
    id: 2,
    question: "React is primarily used for…",
    options: [
      "Styling pages",
      "Managing databases",
      "Building UIs",
      "Server security",
    ],
    correctIndex: 2,
    explanation: "React is a JavaScript library for building UIs.",
  },
  {
    id: 3,
    question: "Which is NOT a JavaScript framework/library?",
    options: ["React", "Angular", "Laravel", "Svelte"],
    correctIndex: 2,
    explanation: "Laravel is a PHP framework.",
  },
  {
    id: 4,
    question: "The tallest building in London is…",
    options: [
      "The Gherkin",
      "The Shard",
      "One Canada Square",
      "The Walkie-Talkie",
    ],
    correctIndex: 1,
    explanation: "The Shard stands at ~310m.",
  },
  {
    id: 5,
    question: "Traditional English afternoon drink?",
    options: ["Coffee", "Juice", "Tea", "Soda"],
    correctIndex: 2,
    explanation: "Afternoon tea is a classic British tradition.",
  },
];

// (Optional) shuffle hook
function useShuffledQuestions(questions, shouldShuffle = false) {
  return useMemo(() => {
    if (!shouldShuffle) return questions;
    const arr = [...questions];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [questions, shouldShuffle]);
}

export default function QuizMUI() {
  const navigate = useNavigate();
  const quiz = useShuffledQuestions(QUESTIONS, false);
  const [qIndex, setQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState(null); // "correct" | "wrong" | "timeout" | null
  const [finished, setFinished] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(
    localStorage.getItem(QUIZ_DONE_KEY) === "true"
  );
  const [snack, setSnack] = useState({ open: false, message: "" });

  const intervalRef = useRef(null);
  const autoNextRef = useRef(null);

  // Load saved state or block if already played
  useEffect(() => {
    if (alreadySubmitted) {
      setFinished(true);
      return;
    }
    try {
      const raw = localStorage.getItem(QUIZ_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.qIndex === "number") setQIndex(saved.qIndex);
      if (typeof saved.score === "number") setScore(saved.score);
      // We restart the timer fresh on resume; progress is preserved by qIndex/score
    } catch {}
  }, [alreadySubmitted]);

  // Timer per question
  useEffect(() => {
    if (finished) return;
    clearInterval(intervalRef.current);
    setSecondsLeft(TIMER_SECONDS);
    setSelected(null);
    setLocked(false);
    setStatus(null);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setLocked(true);
          setStatus("timeout");
          autoNextRef.current = setTimeout(() => handleNext(), 1200);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(autoNextRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, finished]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(autoNextRef.current);
    };
  }, []);

  // Persist progress (qIndex + score) so reload resumes
  useEffect(() => {
    if (finished) return;
    localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify({ qIndex, score }));
  }, [qIndex, score, finished]);

  // useEffect(() => {
  //   const user = JSON.parse(localStorage.getItem("ap_user") || "null");
  //   if (!user?.uuid) return;

  //   axios
  //     .get(`${baseUrl}/api/asian-paint/score/status`, {
  //       params: { uuid: user.uuid, game: "quiz", day: "day1" },
  //     })
  //     .then(({ data }) => {
  //       if (data?.submitted) {
  //         localStorage.setItem("ap_quiz_day1_completed", "true");
  //         setAlreadySubmitted(true);
  //         setFinished(true);
  //       }
  //     })
  //     .catch(() => {});
  // }, []);

  const current = quiz[qIndex];

  const handleOptionClick = (idx) => {
    if (locked || finished) return;
    setSelected(idx);
    const isCorrect = idx === current.correctIndex;
    setLocked(true);
    setStatus(isCorrect ? "correct" : "wrong");
    clearInterval(intervalRef.current);
    if (isCorrect) setScore((s) => s + POINTS_PER_CORRECT);
  };

  const handleNext = () => {
    clearTimeout(autoNextRef.current);
    if (qIndex + 1 < quiz.length) {
      setQIndex((i) => i + 1);
    } else {
      finishQuiz();
    }
  };

  const submitScore = async (points) => {
    try {
      const user = JSON.parse(localStorage.getItem("ap_user") || "null");
      const uuid = user?.uuid || user?.uniqueNo;
      if (!uuid) return;

      await axios.post(`${baseUrl}/api/asian-paint/score`, {
        uuid,
        game: "quiz",
        day: "day1",
        points, // <-- here
      });
      setSnack({ open: true, message: "Score submitted!" });
    } catch (e) {
      if (e?.response?.status === 409) {
        setSnack({ open: true, message: "Already submitted" });
      } else {
        setSnack({ open: true, message: "Score saved locally (offline)" });
      }
    }
  };

  const finishQuiz = () => {
    setFinished(true);
    // lock completion
    localStorage.setItem(QUIZ_DONE_KEY, "true");
    localStorage.removeItem(QUIZ_STATE_KEY); // no need to resume anymore
    setAlreadySubmitted(true);
    // submit once
    submitScore(score);
  };

  const handleRestart = () => {
    // Allowed only if not finished; once finished, replay is blocked
    if (alreadySubmitted) return;
    clearInterval(intervalRef.current);
    clearTimeout(autoNextRef.current);
    setQIndex(0);
    setSecondsLeft(TIMER_SECONDS);
    setSelected(null);
    setLocked(false);
    setScore(0);
    setStatus(null);
    setFinished(false);
    localStorage.setItem(
      QUIZ_STATE_KEY,
      JSON.stringify({ qIndex: 0, score: 0 })
    );
  };

  const progressPct = (secondsLeft / TIMER_SECONDS) * 100;
  const qNumber = qIndex + 1;
  const totalPoints = quiz.length * POINTS_PER_CORRECT;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
      <Grid container justifyContent="center" sx={{ mt: 6, px: "12px" }}>
        <Grid item xs={12} md={9} lg={8}>
          <Stack spacing={2} alignItems="stretch">
            <Typography
              sx={{
                fontSize: { xs: "16px", md: "18px" },
                fontWeight: { xs: 600, md: 800 },
              }}
              align="center"
              color="primary"
            >
              Day 1 - Quiz
            </Typography>

            <Paper elevation={3} sx={{ p: 2 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <Chip
                  label={
                    <Typography fontWeight={700}>
                      Score:{" "}
                      <Typography
                        component="span"
                        color="primary.main"
                        fontWeight={800}
                      >
                        {score}
                      </Typography>{" "}
                      / {totalPoints}
                    </Typography>
                  }
                  variant="outlined"
                />
                <Typography fontWeight={700}>
                  10 points per correct • Question{" "}
                  {Math.min(qNumber, quiz.length)} / {quiz.length}
                </Typography>
                {!finished && (
                  <Chip
                    icon={<AccessTimeIcon />}
                    color={
                      secondsLeft <= 5
                        ? "error"
                        : secondsLeft <= 10
                        ? "warning"
                        : "default"
                    }
                    label={`${secondsLeft}s`}
                    sx={{ fontWeight: 700 }}
                  />
                )}
                {alreadySubmitted && (
                  <Chip
                    color="success"
                    variant="filled"
                    label="Already submitted"
                  />
                )}
              </Stack>

              {!finished && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progressPct}
                    sx={{ height: 8, borderRadius: 999 }}
                  />
                </Box>
              )}
            </Paper>

            {!finished ? (
              <Card elevation={6}>
                <CardHeader
                  title={
                    <Typography
                      variant="Body"
                      sx={{
                        fontSize: { xs: "1rem", md: "1.2rem" },
                        fontWeight: 600,
                        align: "center",
                      }}
                    >
                      {current.question}
                    </Typography>
                  }
                  subheader={
                    status === "timeout" ? (
                      <Typography color="error">Time’s up!</Typography>
                    ) : null
                  }
                />
                <CardContent>
                  <Stack spacing={1.5}>
                    {current.options.map((opt, idx) => {
                      const isCorrect = idx === current.correctIndex;
                      const isSelected = idx === selected;

                      let variant = "outlined";
                      let color = "inherit";
                      let startIcon = null;

                      if (locked) {
                        if (isCorrect) {
                          variant = "contained";
                          color = "success";
                          startIcon = <CheckCircleIcon />;
                        } else if (isSelected && !isCorrect) {
                          variant = "contained";
                          color = "error";
                          startIcon = <CancelIcon />;
                        }
                      } else if (isSelected) {
                        color = "primary";
                        variant = "contained";
                      }

                      return (
                        <Button
                          key={idx}
                          onClick={() => handleOptionClick(idx)}
                          variant={variant}
                          color={color}
                          startIcon={startIcon}
                          disabled={locked}
                          sx={{
                            justifyContent: "flex-start",
                            textTransform: "none",
                            fontWeight: 700,
                            py: 1.25,
                          }}
                          fullWidth
                        >
                          <Box
                            component="span"
                            sx={{
                              mr: 1.25,
                              opacity: 0.7,
                              fontWeight: 800,
                              minWidth: 22,
                              display: "inline-block",
                            }}
                          >
                            {String.fromCharCode(65 + idx)}.
                          </Box>
                          {opt}
                        </Button>
                      );
                    })}
                  </Stack>

                  <Stack
                    direction={{ xs: "row", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                    sx={{ mt: 3 }}
                  >
                    <Typography variant="body1">
                      {locked && status === "correct" && (
                        <Chip
                          color="success"
                          label={`Correct! +${POINTS_PER_CORRECT}`}
                        />
                      )}
                      {locked && status === "wrong" && (
                        <Chip color="error" label="Incorrect" />
                      )}
                      {locked && status === "timeout" && (
                        <Chip color="error" label="Time’s up" />
                      )}
                    </Typography>

                    <Stack direction="row" spacing={1.5}>
                      {/* <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleRestart}
                        disabled={alreadySubmitted}
                      >
                        Restart
                      </Button> */}
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        disabled={!locked}
                      >
                        {qIndex + 1 < quiz.length ? "Next" : "Finish"}
                      </Button>
                    </Stack>
                  </Stack>

                  {locked && current.explanation && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        <strong>Explanation:</strong> {current.explanation}
                      </Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card elevation={6}>
                <CardContent>
                  <Typography
                    sx={{
                      fontSize: { xs: "1.1rem", md: "1.5rem" },
                      fontWeight: { xs: 600, md: 800 },
                    }}
                    align="center"
                    gutterBottom
                  >
                    Quiz Finished!
                  </Typography>
                  <Typography variant="h6" align="center" gutterBottom>
                    You scored{" "}
                    <Typography
                      component="span"
                      color="primary.main"
                      fontWeight={800}
                    >
                      {score}
                    </Typography>{" "}
                    out of {totalPoints}
                  </Typography>

                  <Stack
                    direction="row"
                    justifyContent="center"
                    sx={{ mt: 1 }}
                    spacing={1.5}
                  >
                    <Button variant="contained" onClick={() => navigate("/")}>
                      Home
                    </Button>
                  </Stack>

                  <Box sx={{ mt: { xs: 1, md: 3 } }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      gutterBottom
                    >
                      Review
                    </Typography>
                    {quiz.map((q, i) => (
                      <Paper
                        key={q.id}
                        variant="outlined"
                        sx={{ p: 1.5, mb: 1 }}
                      >
                        <Typography fontWeight={700}>
                          {i + 1}. {q.question}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Correct answer: {q.options[q.correctIndex]}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={1800}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert variant="filled" severity="success" sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
