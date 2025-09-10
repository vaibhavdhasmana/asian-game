// import express from "express";
// import mongoose from "mongoose";
// import morgan from "morgan";
// import cors from "cors";
// import dotenv from "dotenv";
// import path from "path";
// import fs from "fs";
// import { fileURLToPath } from "url";

// import authRoutes from "./routes/auth.js";
// import adminRoutes from "./routes/admin.js";
// import groupRoutes from "./routes/group.js";
// import contentRoutes from "./routes/content.js";
// import scoreRoutes from "./routes/score.js";
// import leaderboardRoutes from "./routes/leaderboard.js";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 7000;
// const MONGO_URI =
//   process.env.MONGO_URI || "mongodb://127.0.0.1:27017/asian_game";
// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const UPLOAD_DIR = path.join(__dirname, "uploads");
// fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// // Middleware
// mongodb: app.use(cors());
// app.use(express.json({ limit: "2mb" }));
// app.use(morgan("dev"));
// // Serve uploaded assets (e.g., jigsaw images)
// app.use("/uploads", express.static(UPLOAD_DIR));

// // Routes
// app.use("/api/asian-paint", authRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api/asian-paint", groupRoutes);
// app.use("/api/asian-paint", contentRoutes);
// app.use("/api/asian-paint", scoreRoutes);
// app.use("/api/asian-paint", leaderboardRoutes);

// app.get("/", (req, res) => res.json({ ok: true }));

// async function start() {
//   try {
//     const url =
//       process.env.NODE_ENV === "production" ? MONGO_URI : process.env.LOCAL_URL;
//     console.log(process.env.NODE_ENV, "url", url);
//     await mongoose.connect(url, { autoIndex: true });
//     console.log("Mongo connected");
//     app.listen(PORT, () => console.log(`API on http://localhost:${url}`));
//   } catch (e) {
//     console.error("Failed to start server", e);
//     process.exit(1);
//   }
// }

// start();
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Load .env from this file's directory (project root assumed)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import groupRoutes from "./routes/group.js";
import contentRoutes from "./routes/content.js";
import scoreRoutes from "./routes/score.js";
import leaderboardRoutes from "./routes/leaderboard.js";

const app = express();
const PORT = process.env.PORT || 7000;

// Prefer a single env var name for DB URI. Support both for convenience.
const DEFAULT_LOCAL = "mongodb://127.0.0.1:27017/asian_game";
const ENV_URI =
  process.env.MONGO_URI?.trim?.() ||
  process.env.MONGODB_URI?.trim?.() ||
  process.env.LOCAL_URL?.trim?.() ||
  DEFAULT_LOCAL;

const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// Serve uploaded assets
app.use("/uploads", express.static(UPLOAD_DIR));

// Routes
app.use("/api/asian-paint", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/asian-paint", groupRoutes);
app.use("/api/asian-paint", contentRoutes);
app.use("/api/asian-paint", scoreRoutes);
app.use("/api/asian-paint", leaderboardRoutes);

app.get("/", (req, res) => res.json({ ok: true }));

async function start() {
  try {
    // Choose URI based on NODE_ENV if you want, but ensure there’s always a value
    const useProd = process.env.NODE_ENV === "production";
    const url = useProd ? ENV_URI : process.env.LOCAL_URL?.trim?.() || ENV_URI;

    if (!url) {
      throw new Error("No MongoDB URI found in env and no default provided.");
    }

    // Helpful debug (redact password)
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log(
      "Mongo URI:",
      url.replace(/(\/\/[^:]+:)([^@]+)(@)/, "$1<redacted>$3")
    );

    await mongoose.connect(url, { autoIndex: true });
    console.log("Mongo connected");

    app.listen(PORT, () =>
      console.log(`API listening on ${process.env.NODE_ENV}:${PORT}`)
    );
  } catch (e) {
    console.error("Failed to start server", e);
    process.exit(1);
  }
}

start();
