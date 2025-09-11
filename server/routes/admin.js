import { Router } from 'express';
import AdminSettings from '../models/AdminSettings.js';
import Submission from '../models/Submission.js';
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
      currentSlot: 1,
      slotsPerDay: { day1: 1, day2: 1, day3: 1 },
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
  res.json({ currentDay: s.currentDay, currentSlot: s.currentSlot, slotsPerDay: s.slotsPerDay, groups: s.groups });
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

// Set current slot (admin)
router.post('/settings/slot', requireAdmin, async (req, res) => {
  const { currentSlot } = req.body || {};
  const n = Number(currentSlot);
  if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ message: 'Invalid slot' });
  const s = await getSettingsDoc();
  s.currentSlot = n;
  await s.save();
  res.json({ ok: true, currentSlot: s.currentSlot });
});

// Set number of slots for a specific day
router.post('/settings/slots-per-day', requireAdmin, async (req, res) => {
  const { day, slots } = req.body || {};
  const dayKey = String(day || '').toLowerCase();
  if (!['day1', 'day2', 'day3'].includes(dayKey)) return res.status(400).json({ message: 'Invalid day' });
  const n = Number(slots);
  if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ message: 'Invalid slots' });
  const s = await getSettingsDoc();
  s.slotsPerDay = s.slotsPerDay || { day1: 1, day2: 1, day3: 1 };
  s.slotsPerDay[dayKey] = n;
  if (s.currentDay === dayKey && s.currentSlot > n) s.currentSlot = n;
  await s.save();
  res.json({ ok: true, slotsPerDay: s.slotsPerDay, currentSlot: s.currentSlot });
});

// List game content (admin)
// GET /api/admin/content/list?day=&game=&slot=&group=&limit=
router.get('/content/list', requireAdmin, async (req, res) => {
  try {
    const { day, game, group, limit } = req.query || {};
    const slotRaw = req.query?.slot;
    const q = {};
    if (day && ['day1', 'day2', 'day3'].includes(String(day))) q.day = String(day);
    if (game && ['quiz', 'crossword', 'wordSearch', 'jigsaw'].includes(String(game))) q.game = String(game);
    if (group) q.groupKey = String(group);
    if (slotRaw != null && slotRaw !== '') {
      const n = Number(slotRaw);
      if (Number.isFinite(n)) q.slot = n;
    }
    const lim = Math.max(1, Math.min(500, Number(limit) || 200));
    const items = await GameContent.find(q)
      .sort({ day: 1, slot: 1, game: 1, version: -1, createdAt: -1 })
      .limit(lim)
      .lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: 'list failed', error: String(e) });
  }
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
    const { day, game, group, slot } = req.query;
    const file = req.file;
    if (!day || !game || !file) return res.status(400).json({ message: 'day, game and file required' });
    const dayKey = String(day);
    const gameKey = String(game);
    const groupKey = group ? String(group) : null;
    const slotNum = slot != null ? Number(slot) : null;

    let payload;
    const version = Date.now();

    // If image upload (e.g., jigsaw), persist file and store URL
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      const ext = path.extname(file.originalname) || '.png';
      const fname = `${dayKey}_${gameKey}${slotNum != null ? '_slot' + slotNum : ''}${groupKey ? '_' + groupKey : ''}_${version}${ext}`;
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
        } else if (gameKey === 'wordSearch') {
          const idxWord = header.indexOf('word');
          let words = [];
          if (idxWord >= 0) {
            words = body.map((r) => (r[idxWord] || '').toString().toUpperCase()).filter(Boolean);
          } else {
            words = body.map((r) => (r[0] || '').toString().toUpperCase()).filter(Boolean);
          }
          const iSr = header.indexOf('start_r');
          const iSc = header.indexOf('start_c');
          const iDr = header.indexOf('dir_r');
          const iDc = header.indexOf('dir_c');
          let placements = [];
          if (iSr >= 0 && iSc >= 0 && iDr >= 0 && iDc >= 0) {
            placements = body.map((r, idx) => ({
              word: ((idxWord >= 0 ? r[idxWord] : r[0]) || '').toString().toUpperCase(),
              start: [Number(r[iSr] || 0), Number(r[iSc] || 0)],
              dir: [Number(r[iDr] || 0), Number(r[iDc] || 1)],
            })).filter((p) => p.word);
          }
          payload = placements.length ? { words, placements } : { words };
        } else {
          payload = { rows: body };
        }
      }
    }

    // Replace existing content for same (day, game, slot, groupKey) or create if missing
    const doc = await GameContent.findOneAndUpdate(
      { day: dayKey, game: gameKey, slot: slotNum, groupKey },
      { $set: { version, payload } },
      { new: true, upsert: true }
    );
    res.json({ version: doc.version, payload: doc.payload });
  } catch (e) {
    res.status(500).json({ message: 'upload failed', error: String(e) });
  }
});

// Upload content via JSON body (no multipart). Body: { day, game, group?, version?, payload? }
// For convenience, if game === 'quiz' and payload is missing but `questions` is provided at top level,
// it will wrap into { questions, timerSeconds?/timeLimit? }.
router.post('/content/json', requireAdmin, async (req, res) => {
  try {
    const { day, game, group, slot, version, payload, questions, timerSeconds, timeLimit } = req.body || {};
    if (!day || !game) return res.status(400).json({ message: 'day and game required' });
    const dayKey = String(day);
    const gameKey = String(game);
    const groupKey = group ? String(group) : null;
    const slotNum = slot != null ? Number(slot) : null;

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
    // Replace existing content for same (day, game, slot, groupKey) or create if missing
    const doc = await GameContent.findOneAndUpdate(
      { day: dayKey, game: gameKey, slot: slotNum, groupKey },
      { $set: { version: ver, payload: usePayload } },
      { new: true, upsert: true }
    );
    res.json({ version: doc.version, payload: doc.payload });
  } catch (e) {
    res.status(500).json({ message: 'json upload failed', error: String(e) });
  }
});

// Admin: reset submissions for a user (optionally filter by day/slot/game)
// POST /api/admin/submissions/reset
// Body: { uuid: string, day?: 'day1'|'day2'|'day3', slot?: number, game?: 'quiz'|'crossword'|'wordSearch'|'jigsaw' }
router.post('/submissions/reset', requireAdmin, async (req, res) => {
  try {
    const { uuid, day, slot, game } = req.body || {};
    if (!uuid) return res.status(400).json({ message: 'uuid required' });
    const q = { uuid };
    if (day) q.day = String(day);
    if (Number.isFinite(Number(slot))) q.slot = Number(slot);
    if (game) q.game = String(game);
    const result = await Submission.deleteMany(q);
    return res.json({ ok: true, deleted: result.deletedCount || 0 });
  } catch (e) {
    return res.status(500).json({ message: 'reset failed', error: String(e) });
  }
});

export default router;
