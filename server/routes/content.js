import { Router } from 'express';
import GameContent from '../models/GameContent.js';
import User from '../models/User.js';

const router = Router();

// GET /api/asian-paint/content?day=&game=&uuid=
router.get('/content', async (req, res) => {
  try {
    const { day, game, uuid } = req.query;
    if (!day || !game) return res.status(400).json({ message: 'day and game required' });
    let groupKey = null;
    if (uuid) {
      const user = await User.findOne({ uuid });
      groupKey = user?.groupKey || null;
    }

    // Prefer group-specific, fallback to general
    const q = { day: String(day), game: String(game) };
    const specific = await GameContent.findOne({ ...q, groupKey }).sort({ version: -1, createdAt: -1 });
    const general = await GameContent.findOne({ ...q, groupKey: null }).sort({ version: -1, createdAt: -1 });
    const doc = specific || general;
    if (!doc) return res.status(404).json({ message: 'No content' });
    res.json({ version: doc.version, payload: doc.payload });
  } catch (e) {
    res.status(500).json({ message: 'content fetch failed', error: String(e) });
  }
});

export default router;

