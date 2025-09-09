import { Router } from 'express';
import AdminSettings from '../models/AdminSettings.js';
import GameContent from '../models/GameContent.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const upload = multer();
const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

import User from '../models/User.js';

async function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  const envKey = process.env.ADMIN_KEY || process.env.VITE_ADMIN_KEY;
  if (!envKey || key === envKey) return next();
  const uuid = req.headers['x-admin-uuid'];
  if (uuid) {
    try {
      const u = await User.findOne({ uuid });
      if (u?.isAdmin) return next();
    } catch {}
  }
  return res.status(401).json({ message: 'Admin authorization required' });
}

async function getSettingsDoc() {
  let doc = await AdminSettings.findOne();
  if (!doc) {
    doc = await AdminSettings.create({
      currentDay: 'day1',
      groups: {
        day2: [
          { key: 'queen', label: "The Queen's Palette", logo: '' },
          { key: 'king', label: "The King's Tone", logo: '' },
          { key: 'bishop', label: "The Bishop's Gambit", logo: '' },
          { key: 'rook', label: "The Rook's Canvas", logo: '' },
        ],
        day3: [
          { key: 'queen', label: "The Queen's Palette", logo: '' },
          { key: 'king', label: "The King's Tone", logo: '' },
          { key: 'bishop', label: "The Bishop's Gambit", logo: '' },
          { key: 'rook', label: "The Rook's Canvas", logo: '' },
        ],
      },
    });
  }
  return doc;
}

// Public settings (frontend uses this)
router.get('/public/settings', async (req, res) => {
  const s = await getSettingsDoc();
  res.json({ currentDay: s.currentDay, groups: s.groups });
});

// Admin settings (secured)
router.get('/settings', requireAdmin, async (req, res) => {
  const s = await getSettingsDoc();
  res.json(s);
});

router.post('/settings/day', requireAdmin, async (req, res) => {
  const { currentDay } = req.body || {};
  if (!['day1', 'day2', 'day3'].includes(String(currentDay))) {
    return res.status(400).json({ message: 'Invalid day' });
  }
  const s = await getSettingsDoc();
  s.currentDay = currentDay;
  await s.save();
  res.json({ ok: true, currentDay: s.currentDay });
});

router.post('/settings/groups', requireAdmin, async (req, res) => {
  const { day, colors, groups } = req.body || {};
  const s = await getSettingsDoc();
  const dayKey = String(day);
  if (!['day2', 'day3'].includes(dayKey)) return res.status(400).json({ message: 'Invalid day' });
  // Support legacy payload `colors: ["red", ...]` by mapping to label-less groups
  if (Array.isArray(colors)) {
    s.groups[dayKey] = colors.map((c) => ({ key: String(c), label: String(c), logo: '' }));
  } else if (Array.isArray(groups)) {
    s.groups[dayKey] = groups.map((g) => ({ key: g.key, label: g.label || g.key, logo: g.logo || '' }));
  } else {
    return res.status(400).json({ message: 'Provide groups or colors' });
  }
  await s.save();
  res.json({ ok: true, groups: s.groups[dayKey] });
});

// Promote/demote a user to admin (secured by admin key only)
router.post('/users/admin', async (req, res) => {
  const key = req.headers['x-admin-key'];
  const envKey = process.env.ADMIN_KEY || process.env.VITE_ADMIN_KEY;
  if (envKey && key !== envKey) return res.status(401).json({ message: 'Invalid admin key' });
  const { uuid, isAdmin } = req.body || {};
  if (!uuid || typeof isAdmin !== 'boolean') return res.status(400).json({ message: 'uuid and isAdmin required' });
  const u = await User.findOneAndUpdate({ uuid }, { $set: { isAdmin } }, { new: true });
  if (!u) return res.status(404).json({ message: 'user not found' });
  res.json({ ok: true, user: u });
});

// Upload content (CSV/JSON). Query: day, game, group(optional)
router.post('/content/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { day, game, group } = req.query;
    const file = req.file;
    if (!day || !game || !file) return res.status(400).json({ message: 'day, game and file required' });
    const dayKey = String(day);
    const gameKey = String(game);
    const groupKey = group ? String(group) : null;

    let payload;
    const version = Date.now();

    // If image upload (e.g., jigsaw), persist file and store URL
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      const ext = path.extname(file.originalname) || '.png';
      const fname = `${dayKey}_${gameKey}${groupKey ? '_' + groupKey : ''}_${version}${ext}`;
      const fpath = path.join(UPLOAD_DIR, fname);
      fs.writeFileSync(fpath, file.buffer);
      payload = { imageUrl: `/uploads/${fname}` };
    } else {
      // Basic parse: try JSON first, else CSV for quiz
      const text = file.buffer.toString('utf8');
      try {
        payload = JSON.parse(text);
      } catch {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
        const rows = lines.map((l) => l.split(',').map((s) => s.trim()));
        const header = (rows[0] || []).map((h) => h.toLowerCase());
        const body = rows.slice(1);
        if (gameKey === 'quiz') {
          const qList = [];
          for (let i = 0; i < body.length; i++) {
            const r = body[i];
            const get = (name) => {
              const idx = header.indexOf(name);
              return idx >= 0 ? r[idx] : undefined;
            };
            const q = get('question') || r[1] || '';
            const optA = get('opta') || get('opt1') || get('optiona') || r[2] || '';
            const optB = get('optb') || get('opt2') || get('optionb') || r[3] || '';
            const optC = get('optc') || get('opt3') || get('optionc') || r[4] || '';
            const optD = get('optd') || get('opt4') || get('optiond') || r[5] || '';
            let ci = get('correctindex');
            if (ci == null) {
              const cad = (get('correct(a-d)') || '').toString().trim().toUpperCase();
              if (cad === 'A') ci = 0; else if (cad === 'B') ci = 1; else if (cad === 'C') ci = 2; else if (cad === 'D') ci = 3;
            }
            const exp = get('explanation') || '';
            qList.push({
              id: Number(get('id') || i + 1),
              question: q,
              options: [optA, optB, optC, optD],
              correctIndex: Math.max(0, Math.min(3, Number(ci || 0))),
              explanation: exp,
            });
          }
          payload = { questions: qList };
        } else {
          payload = { rows: body };
        }
      }
    }

    await GameContent.create({ day: dayKey, game: gameKey, groupKey, version, payload });
    res.json({ version, payload });
  } catch (e) {
    res.status(500).json({ message: 'upload failed', error: String(e) });
  }
});

// Upload content via JSON body (no multipart). Body: { day, game, group?, version?, payload? }
// For convenience, if game === 'quiz' and payload is missing but `questions` is provided at top level,
// it will wrap into { questions, timerSeconds?/timeLimit? }.
router.post('/content/json', requireAdmin, async (req, res) => {
  try {
    const { day, game, group, version, payload, questions, timerSeconds, timeLimit } = req.body || {};
    if (!day || !game) return res.status(400).json({ message: 'day and game required' });
    const dayKey = String(day);
    const gameKey = String(game);
    const groupKey = group ? String(group) : null;

    let usePayload = payload;
    if (!usePayload && gameKey === 'quiz' && Array.isArray(questions)) {
      const p = { questions };
      if (timerSeconds != null) p.timerSeconds = Number(timerSeconds);
      if (timeLimit != null) p.timeLimit = Number(timeLimit);
      usePayload = p;
    }
    if (!usePayload || typeof usePayload !== 'object') {
      return res.status(400).json({ message: 'payload required (or questions[] for quiz)' });
    }

    const ver = Number.isFinite(Number(version)) ? Number(version) : Date.now();
    await GameContent.create({ day: dayKey, game: gameKey, groupKey, version: ver, payload: usePayload });
    res.json({ version: ver, payload: usePayload });
  } catch (e) {
    res.status(500).json({ message: 'json upload failed', error: String(e) });
  }
});

export default router;
