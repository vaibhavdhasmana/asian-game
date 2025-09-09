import { Router } from 'express';
import Submission from '../models/Submission.js';
import GameContent from '../models/GameContent.js';

const router = Router();

// Helpers
async function scoreQuiz({ uuid, day, contentVersion, answers }) {
  const content = await GameContent.findOne({ day, game: 'quiz', version: contentVersion });
  if (!content) return 0;
  const qs = content.payload?.questions || [];
  let correct = 0;
  for (let i = 0; i < qs.length; i++) {
    const idx = answers?.[i];
    if (typeof idx === 'number' && idx === qs[i].correctIndex) correct++;
  }
  return correct * 10;
}

function scoreGeneric(game, payload) {
  if (game === 'wordSearch') {
    const found = Number(payload?.found || 0);
    const ppw = Number(payload?.pointsPerWord) || 10;
    const wordsMax = Number(payload?.wordsMax || found);
    const cap = Number(payload?.maxScore) || wordsMax * ppw || 500;
    return Math.max(0, Math.min(cap, found * ppw));
  }
  if (game === 'jigsaw') {
    const tiles = Number(payload?.tiles || 0);
    const bonus = Math.max(0, Number(payload?.bonus || 0));
    const ppt = Number(payload?.pointsPerTile) || 10;
    const tilesMax = Number(payload?.tilesMax || tiles);
    const cap = Number(payload?.maxScore) || tilesMax * ppt || 200;
    return Math.max(0, Math.min(cap, tiles * ppt + bonus));
  }
  if (game === 'crossword') {
    const words = Number(payload?.words || 0);
    return Math.max(0, Math.min(200, words * 10));
  }
  return 0;
}

// Status
router.get('/score/status', async (req, res) => {
  const { uuid, day, game } = req.query;
  if (!uuid || !day || !game) return res.status(400).json({ message: 'uuid, day, game required' });
  const doc = await Submission.findOne({ uuid, day, game });
  res.json({ submitted: !!doc?.final, points: doc?.score || 0 });
});

// Progress upsert
router.post('/score/progress', async (req, res) => {
  try {
    const { uuid, day, game, contentVersion, payload } = req.body || {};
    if (!uuid || !day || !game) return res.status(400).json({ message: 'uuid, day, game required' });
    let score = 0;
    if (game === 'quiz') {
      if (contentVersion == null) return res.status(400).json({ message: 'contentVersion required for quiz' });
      score = await scoreQuiz({ uuid, day, contentVersion, answers: payload?.answers });
    } else {
      score = scoreGeneric(game, payload);
    }
    let doc = await Submission.findOne({ uuid, day, game });
    if (doc && doc.final) return res.status(409).json({ message: 'Already submitted' });
    if (doc) {
      doc.score = Math.max(doc.score || 0, score);
      if (contentVersion != null) doc.contentVersion = contentVersion;
      doc.meta = payload || {};
      await doc.save();
      return res.json({ score: doc.score, final: false });
    }
    const ver = contentVersion != null ? contentVersion : Date.now();
    doc = await Submission.create({ uuid, day, game, contentVersion: ver, score, meta: payload || {}, final: false });
    res.json({ score: doc.score, final: false });
  } catch (e) {
    res.status(500).json({ message: 'progress failed', error: String(e) });
  }
});

// Final submit
router.post('/score/submit', async (req, res) => {
  try {
    const { uuid, day, game, contentVersion, payload } = req.body || {};
    if (!uuid || !day || !game || contentVersion == null)
      return res.status(400).json({ message: 'uuid, day, game, contentVersion required' });
    const exists = await Submission.findOne({ uuid, day, game });
    if (exists && exists.final) return res.status(409).json({ message: 'Already submitted' });
    let score = 0;
    if (game === 'quiz') score = await scoreQuiz({ uuid, day, contentVersion, answers: payload?.answers });
    else score = scoreGeneric(game, payload);
    let sub;
    if (exists) {
      exists.score = Math.max(exists.score || 0, score);
      exists.contentVersion = contentVersion;
      exists.meta = payload || {};
      exists.final = true;
      sub = await exists.save();
    } else {
      sub = await Submission.create({ uuid, day, game, contentVersion, score, meta: payload || {}, final: true });
    }
    res.json({ score: sub.score, final: true });
  } catch (e) {
    res.status(500).json({ message: 'submit failed', error: String(e) });
  }
});

// Legacy points (treat as progress)
router.post('/score', async (req, res) => {
  try {
    const { uuid, day, game, points } = req.body || {};
    if (!uuid || !day || !game || typeof points !== 'number')
      return res.status(400).json({ message: 'uuid, day, game, points required' });
    const doc = await Submission.findOne({ uuid, day, game });
    if (doc && doc.final) return res.status(409).json({ message: 'Already submitted' });
    if (doc) {
      doc.score = Math.max(doc.score || 0, Math.floor(points));
      await doc.save();
      return res.json({ score: doc.score, final: !!doc.final });
    }
    const sub = await Submission.create({ uuid, day, game, contentVersion: Date.now(), score: Math.max(0, Math.floor(points)), meta: { legacy: true }, final: false });
    res.json({ score: sub.score, final: false });
  } catch (e) {
    res.status(500).json({ message: 'legacy submit failed', error: String(e) });
  }
});

// Totals
router.get('/score/total', async (req, res) => {
  const { uuid } = req.query;
  if (!uuid) return res.status(400).json({ message: 'uuid required' });
  const rows = await Submission.aggregate([{ $match: { uuid } }, { $group: { _id: null, total: { $sum: '$score' } } }]);
  res.json({ total: rows[0]?.total || 0 });
});

router.get('/score/detail', async (req, res) => {
  const { uuid } = req.query;
  if (!uuid) return res.status(400).json({ message: 'uuid required' });
  const rows = await Submission.find({ uuid });
  const score = {};
  for (const r of rows) {
    score[r.game] = score[r.game] || {};
    score[r.day] = score[r.day] || 0;
    score[r.game][r.day] = (score[r.game][r.day] || 0) + (r.score || 0);
  }
  res.json({ score });
});

export default router;
