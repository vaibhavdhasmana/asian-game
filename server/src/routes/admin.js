const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Settings = require("../models/Settings");
const Content = require("../models/Content");
const { parseCSV } = require("../utils/csvParser");
const { adminAuth } = require("../middleware/auth");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      path.extname(file.originalname).toLowerCase() === ".csv"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// GET /api/admin/settings
router.get("/settings", adminAuth, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    res.json({
      currentDay: settings.currentDay,
      groupsColors: settings.groupsColors,
    });
  } catch (error) {
    console.error("Settings fetch error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// POST /api/admin/settings/day
router.post("/settings/day", adminAuth, async (req, res) => {
  try {
    const { currentDay } = req.body;

    if (!["day1", "day2", "day3"].includes(currentDay)) {
      return res.status(400).json({
        error: "Invalid day value",
      });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.currentDay = currentDay;
    await settings.save();

    res.json({
      message: "Current day updated successfully",
    });
  } catch (error) {
    console.error("Settings update error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// POST /api/admin/content/upload?day=...&game=...&group=...
router.post(
  "/content/upload",
  adminAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const { day, game, group = "default" } = req.query;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: "No file uploaded",
        });
      }

      if (!day || !game) {
        return res.status(400).json({
          error: "Day and game parameters are required",
        });
      }

      // Validate parameters
      if (!["day1", "day2", "day3"].includes(day)) {
        return res.status(400).json({
          error: "Invalid day value",
        });
      }

      if (!["quiz", "crossword", "wordSearch"].includes(game)) {
        return res.status(400).json({
          error: "Invalid game value",
        });
      }

      // Parse CSV
      const csvData = await parseCSV(file.path);

      // Get latest version for this content
      const latestContent = await Content.findOne({ day, game, group }).sort({
        version: -1,
      });

      const newVersion = latestContent ? latestContent.version + 1 : 1;

      // Save to database
      const content = new Content({
        day,
        game,
        group,
        version: newVersion,
        data: csvData,
      });

      await content.save();

      // Clean up uploaded file
      fs.unlinkSync(file.path);

      res.json({
        version: newVersion,
        message: "Content uploaded successfully",
      });
    } catch (error) {
      console.error("Content upload error:", error);

      // Clean up file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

// POST /api/admin/settings/groups-colors
router.post("/settings/groups-colors", adminAuth, async (req, res) => {
  try {
    const { day, colors } = req.body;

    if (!day || !["day2", "day3"].includes(day)) {
      return res.status(400).json({
        error: "Valid day (day2 or day3) is required",
      });
    }

    if (!Array.isArray(colors)) {
      return res.status(400).json({
        error: "Colors must be an array",
      });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.groupsColors[day] = colors;
    await settings.save();

    res.json({
      message: "Groups colors updated successfully",
    });
  } catch (error) {
    console.error("Groups colors update error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
