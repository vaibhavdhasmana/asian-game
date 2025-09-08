const express = require("express");
const User = require("../models/User");
const Groups = require("../models/Groups");

const router = express.Router();

// Helper function to calculate total score
const calculateTotalScore = (score) => {
  const games = ["quiz", "crossword", "wordSearch"];
  const days = ["day1", "day2", "day3"];

  return games.reduce((total, game) => {
    return (
      total +
      days.reduce((gameTotal, day) => {
        return gameTotal + (score[game]?.[day] || 0);
      }, 0)
    );
  }, 0);
};

// Helper function to calculate day score
const calculateDayScore = (score, day) => {
  const games = ["quiz", "crossword", "wordSearch"];

  return games.reduce((total, game) => {
    return total + (score[game]?.[day] || 0);
  }, 0);
};

// POST /api/asian-paint/register
router.post("/register", async (req, res) => {
  try {
    const { name, uuid } = req.body;

    if (!name || !uuid) {
      return res.status(400).json({
        statusCode: 400,
        message: "Name and UUID are required",
      });
    }

    const existingUser = await User.findOne({ uuid });
    if (existingUser) {
      return res.status(400).json({
        statusCode: 400,
        message: "User already registered",
      });
    }

    const user = new User({ name, uuid });
    await user.save();

    res.status(201).json({
      statusCode: 200,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Internal server error",
    });
  }
});

// GET /api/asian-paint/score/detail?uuid=...
router.get("/score/detail", async (req, res) => {
  try {
    const { uuid } = req.query;

    if (!uuid) {
      return res.status(400).json({
        error: "UUID is required",
      });
    }

    const user = await User.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      score: user.score,
    });
  } catch (error) {
    console.error("Score detail error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// GET /api/asian-paint/leaderboard?scope=overall|day&day=...&limit=...
router.get("/leaderboard", async (req, res) => {
  try {
    const { scope = "overall", day = "day1", limit = 50 } = req.query;
    const limitNum = parseInt(limit) || 50;

    let users;

    if (scope === "day") {
      users = await User.find({}).select("name uuid score").lean();

      users = users.map((user) => ({
        name: user.name,
        uuid: user.uuid,
        total: calculateDayScore(user.score, day),
      }));
    } else {
      users = await User.find({}).select("name uuid score").lean();

      users = users.map((user) => ({
        name: user.name,
        uuid: user.uuid,
        total: calculateTotalScore(user.score),
      }));
    }

    // Sort by total descending
    users.sort((a, b) => b.total - a.total);

    // Limit results
    const leaderboard = users.slice(0, limitNum);

    res.json({
      leaderboard,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// GET /api/asian-paint/leaderboard/grouped?day=...
router.get("/leaderboard/grouped", async (req, res) => {
  try {
    const { day } = req.query;

    if (!day || !["day2", "day3"].includes(day)) {
      return res.status(400).json({
        error: "Valid day (day2 or day3) is required",
      });
    }

    const groupsData = await Groups.findOne({ day });
    if (!groupsData) {
      return res.json({
        groups: [],
      });
    }

    res.json({
      groups: groupsData.groups,
    });
  } catch (error) {
    console.error("Grouped leaderboard error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
