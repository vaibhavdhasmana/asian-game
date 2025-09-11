import { Router } from "express";
import GameContent from "../models/GameContent.js";
import User from "../models/User.js";

const router = Router();

// GET /api/asian-paint/content?day=&game=&uuid=
router.get("/content", async (req, res) => {
  try {
    const { day, game, uuid } = req.query;
    if (!day || !game)
      return res.status(400).json({ message: "day and game required" });
    let groupKey = null;
    const slot = req.query.slot != null ? Number(req.query.slot) : null;
    if (uuid) {
      const user = await User.findOne({ uuid });
      groupKey = user?.groupKey || null;
    }

    // Prefer slot + group-specific, then slot-only, then no-slot group-specific, then no-slot general
    const q = { day: String(day), game: String(game) };
    const sSlot = slot != null ? slot : null;
    let doc = null;
    if (sSlot != null) {
      doc = await GameContent.findOne({ ...q, slot: sSlot, groupKey }).sort({
        version: -1,
        createdAt: -1,
      });
      if (!doc)
        doc = await GameContent.findOne({
          ...q,
          slot: sSlot,
          groupKey: null,
        }).sort({ version: -1, createdAt: -1 });
    }
    if (!doc) {
      doc = await GameContent.findOne({ ...q, slot: null, groupKey }).sort({
        version: -1,
        createdAt: -1,
      });
      if (!doc)
        doc = await GameContent.findOne({
          ...q,
          slot: null,
          groupKey: null,
        }).sort({ version: -1, createdAt: -1 });
    }
    if (!doc) return res.status(404).json({ message: "No content" });
    res.json({ version: doc.version, payload: doc.payload });
  } catch (e) {
    res.status(500).json({ message: "content fetch failed", error: String(e) });
  }
});

export default router;
