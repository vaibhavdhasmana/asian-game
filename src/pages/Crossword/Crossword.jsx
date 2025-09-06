import React, { useState, useRef, useEffect } from "react";

// --- Puzzle Data ---
// This object holds all the information about our crossword puzzle.
const puzzleData = {
  solution: [
    ["R", "E", "A", "C", "T"],
    ["U", " ", " ", "S", " "],
    ["B", "O", "O", "K", "S"],
    ["Y", " ", " ", "S", " "],
    [" ", "H", "T", "M", "L"],
  ],
  clues: {
    across: [
      {
        number: 1,
        clue: "A popular JavaScript library for building user interfaces.",
        word: "REACT",
        row: 0,
        col: 0,
        length: 5,
      },
      {
        number: 3,
        clue: "You read these to learn new things.",
        word: "BOOKS",
        row: 2,
        col: 0,
        length: 5,
      },
      {
        number: 5,
        clue: "The standard markup language for creating web pages.",
        word: "HTML",
        row: 4,
        col: 1,
        length: 4,
      },
    ],
    down: [
      {
        number: 1,
        clue: "A precious red gemstone.",
        word: "RUBY",
        row: 0,
        col: 0,
        length: 4,
      },
      {
        number: 2,
        clue: "To score a point in some sports.",
        word: "TALLY",
        row: 0,
        col: 4,
        length: 5,
      },
      {
        number: 4,
        clue: "CSS is used for this.",
        word: "STYLE",
        row: 0,
        col: 3,
        length: 5,
      },
    ],
  },
  gridSize: 5,
};

// --- Helper Components ---

// A small, reusable component for the notification that appears when a word is solved.
const SolvedNotification = ({ message, visible }) => {
  if (!visible) return null;
  return (
    <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-out z-50">
      {message}
    </div>
  );
};

// --- Main Crossword Component ---
export default function Register() {
  const [grid, setGrid] = useState(
    Array.from({ length: puzzleData.gridSize }, () =>
      Array(puzzleData.gridSize).fill("")
    )
  );
  const [score, setScore] = useState(0);
  const [solvedWords, setSolvedWords] = useState([]);
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
  });
  const inputRefs = useRef(
    Array.from({ length: puzzleData.gridSize }, () =>
      Array(puzzleData.gridSize).fill(null)
    )
  );

  // Show and then hide the notification
  const showNotification = (message) => {
    setNotification({ visible: true, message });
    setTimeout(() => {
      setNotification({ visible: false, message: "" });
    }, 2000);
  };

  // Check if any words are solved after a change
  const checkWords = (updatedGrid) => {
    const newlySolvedWords = [];

    // Check across words
    puzzleData.clues.across.forEach((clueInfo) => {
      if (solvedWords.includes(clueInfo.word)) return; // Already solved

      let isSolved = true;
      for (let i = 0; i < clueInfo.length; i++) {
        const cellValue = updatedGrid[clueInfo.row]?.[clueInfo.col + i] || "";
        if (cellValue.toUpperCase() !== clueInfo.word[i]) {
          isSolved = false;
          break;
        }
      }
      if (isSolved) {
        newlySolvedWords.push(clueInfo.word);
      }
    });

    // Check down words
    puzzleData.clues.down.forEach((clueInfo) => {
      if (solvedWords.includes(clueInfo.word)) return; // Already solved

      let isSolved = true;
      for (let i = 0; i < clueInfo.length; i++) {
        const cellValue = updatedGrid[clueInfo.row + i]?.[clueInfo.col] || "";
        if (cellValue.toUpperCase() !== clueInfo.word[i]) {
          isSolved = false;
          break;
        }
      }
      if (isSolved) {
        newlySolvedWords.push(clueInfo.word);
      }
    });

    if (newlySolvedWords.length > 0) {
      // Remove duplicates in case a letter solves two words
      const uniqueNewWords = [...new Set(newlySolvedWords)];

      setSolvedWords((prev) => [...prev, ...uniqueNewWords]);
      setScore((prevScore) => prevScore + uniqueNewWords.length * 10);
      uniqueNewWords.forEach((word) => {
        showNotification(`Solved: "${word}"! +10 Points`);
      });
    }
  };

  const handleInputChange = (e, row, col) => {
    const value = e.target.value.toUpperCase();

    // Only allow one letter
    if (value.length > 1) return;

    const newGrid = grid.map((r, rowIndex) =>
      r.map((c, colIndex) => (rowIndex === row && colIndex === col ? value : c))
    );

    setGrid(newGrid);
    checkWords(newGrid);

    // Auto-focus next input
    if (
      value &&
      col < puzzleData.gridSize - 1 &&
      puzzleData.solution[row][col + 1] !== " "
    ) {
      inputRefs.current[row][col + 1]?.focus();
    } else if (
      value &&
      row < puzzleData.gridSize - 1 &&
      puzzleData.solution[row + 1][col] !== " "
    ) {
      inputRefs.current[row + 1][col]?.focus();
    }
  };

  const handleKeyDown = (e, row, col) => {
    if (e.key === "Backspace" && !grid[row][col]) {
      // Move to previous cell on backspace in empty cell
      if (col > 0 && puzzleData.solution[row][col - 1] !== " ") {
        inputRefs.current[row][col - 1]?.focus();
      } else if (row > 0 && puzzleData.solution[row - 1][col] !== " ") {
        inputRefs.current[row - 1][col]?.focus();
      }
    }
  };

  const handleClueClick = (clue) => {
    inputRefs.current[clue.row][clue.col]?.focus();
  };

  const resetGame = () => {
    setGrid(
      Array.from({ length: puzzleData.gridSize }, () =>
        Array(puzzleData.gridSize).fill("")
      )
    );
    setScore(0);
    setSolvedWords([]);
    inputRefs.current[0][0]?.focus();
  };

  const renderCell = (row, col) => {
    const isBlack = puzzleData.solution[row][col] === " ";
    const clueNumber =
      puzzleData.clues.across.find((c) => c.row === row && c.col === col)
        ?.number ||
      puzzleData.clues.down.find((c) => c.row === row && c.col === col)?.number;

    if (isBlack) {
      return (
        <td
          key={`${row}-${col}`}
          className="bg-gray-800 border border-gray-600"
        ></td>
      );
    }

    return (
      <td
        key={`${row}-${col}`}
        className="relative bg-gray-100 border-2 border-gray-400 p-0"
      >
        {clueNumber && (
          <span className="absolute top-0 left-0.5 text-xs font-bold text-gray-500">
            {clueNumber}
          </span>
        )}
        <input
          ref={(el) => (inputRefs.current[row][col] = el)}
          type="text"
          maxLength="1"
          value={grid[row]?.[col] || ""}
          onChange={(e) => handleInputChange(e, row, col)}
          onKeyDown={(e) => handleKeyDown(e, row, col)}
          className="w-full h-full text-center text-lg sm:text-xl font-bold uppercase bg-transparent focus:outline-none focus:bg-yellow-200 transition-colors"
        />
      </td>
    );
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 sm:p-8 flex flex-col items-center font-sans">
      <style>{`
        .crossword-grid { aspect-ratio: 1 / 1; table-layout: fixed;}
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2s ease-in-out forwards; }
      `}</style>

      <SolvedNotification
        message={notification.message}
        visible={notification.visible}
      />

      <header className="w-full max-w-5xl text-center mb-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-yellow-400">
          React Crossword
        </h1>
        <p className="text-gray-400 mt-2">
          Solve the clues and test your knowledge!
        </p>
      </header>

      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6 lg:gap-8">
        {/* Left Side: Grid and Score */}
        <main className="w-full md:w-1/2 flex flex-col items-center">
          <div className="bg-gray-800 p-2 sm:p-3 rounded-lg shadow-2xl w-full max-w-md">
            <table className="crossword-grid w-full border-collapse">
              <tbody>
                {Array.from({ length: puzzleData.gridSize }).map(
                  (_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: puzzleData.gridSize }).map(
                        (_, colIndex) => renderCell(rowIndex, colIndex)
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-6 w-full max-w-md flex justify-between items-center bg-gray-800 p-4 rounded-lg">
            <div className="text-xl sm:text-2xl font-bold">
              Score: <span className="text-yellow-400">{score}</span>
            </div>
            <button
              onClick={resetGame}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"
            >
              Reset
            </button>
          </div>
        </main>

        {/* Right Side: Clues */}
        <aside className="w-full md:w-1/2 bg-gray-800 p-4 sm:p-6 rounded-lg shadow-2xl">
          <div className="flex flex-col sm:flex-row gap-6 h-full">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 border-b-2 border-yellow-400 pb-2 mb-3">
                Across
              </h2>
              <ul className="space-y-2">
                {puzzleData.clues.across.map((clueInfo) => (
                  <li
                    key={clueInfo.number}
                    onClick={() => handleClueClick(clueInfo)}
                    className={`transition-colors text-sm sm:text-base p-1 rounded-md cursor-pointer hover:bg-gray-700 ${
                      solvedWords.includes(clueInfo.word)
                        ? "text-green-400 line-through"
                        : ""
                    }`}
                  >
                    <strong className="mr-2">{clueInfo.number}.</strong>{" "}
                    {clueInfo.clue}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 border-b-2 border-yellow-400 pb-2 mb-3">
                Down
              </h2>
              <ul className="space-y-2">
                {puzzleData.clues.down.map((clueInfo) => (
                  <li
                    key={clueInfo.number}
                    onClick={() => handleClueClick(clueInfo)}
                    className={`transition-colors text-sm sm:text-base p-1 rounded-md cursor-pointer hover:bg-gray-700 ${
                      solvedWords.includes(clueInfo.word)
                        ? "text-green-400 line-through"
                        : ""
                    }`}
                  >
                    <strong className="mr-2">{clueInfo.number}.</strong>{" "}
                    {clueInfo.clue}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
