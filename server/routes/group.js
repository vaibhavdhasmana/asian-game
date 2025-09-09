import { Router } from 'express';
import User from '../models/User.js';
import AdminSettings from '../models/AdminSettings.js';

const router = Router();

// GET /api/asian-paint/group/options?day=day2|day3
router.get('/group/options', async (req, res) => {
  const { day } = req.query;
  const s = await AdminSettings.findOne();
  const dayKey = String(day || 'day2');
  const list = s?.groups?.[dayKey] || [];
  res.json({ options: list });
});

// GET /api/asian-paint/group?uuid=...
router.get('/group', async (req, res) => {
  const { uuid } = req.query;
  if (!uuid) return res.status(400).json({ message: 'uuid required' });
  const user = await User.findOne({ uuid });
  res.json({ groupKey: user?.groupKey || null });
});

// POST /api/asian-paint/group/select { uuid, groupKey }
router.post('/group/select', async (req, res) => {
  const { uuid, groupKey } = req.body || {};
  if (!uuid || !groupKey) return res.status(400).json({ message: 'uuid and groupKey required' });
  const user = await User.findOne({ uuid });
  if (!user) return res.status(404).json({ message: 'user not found' });
  if (user.groupKey) return res.status(409).json({ message: 'group already selected' });
  user.groupKey = groupKey;
  await user.save();
  res.json({ groupKey: user.groupKey });
});

// Backwards compatibility: color endpoints
router.get('/group/color', async (req, res) => {
  const { uuid } = req.query;
  const user = await User.findOne({ uuid });
  res.json({ color: user?.groupKey || null });
});
router.post('/group/color', async (req, res) => {
  const { uuid, color } = req.body || {};
  if (!uuid || !color) return res.status(400).json({ message: 'uuid and color required' });
  const user = await User.findOne({ uuid });
  if (!user) return res.status(404).json({ message: 'user not found' });
  if (user.groupKey) return res.status(409).json({ message: 'group already selected' });
  user.groupKey = String(color);
  await user.save();
  res.json({ color: user.groupKey });
});

export default router;

