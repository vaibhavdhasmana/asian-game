import { Router } from 'express';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import AdminSettings from '../models/AdminSettings.js';

const router = Router();

// GET /api/asian-paint/leaderboard?scope=overall|day&day=&limit=&game=
router.get('/leaderboard', async (req, res) => {
  const scope = req.query.scope === 'day' ? 'day' : 'overall';
  const day = String(req.query.day || 'day1');
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 50));
  const game = String(req.query.game || 'all');

  const match = {};
  if (scope === 'day') match.day = day;
  if (game !== 'all') match.game = game;

  const agg = await Submission.aggregate([
    { $match: match },
    { $group: { _id: '$uuid', total: { $sum: '$score' } } },
    { $sort: { total: -1 } },
    { $limit: limit },
  ]);

  const uuids = agg.map((r) => r._id);
  const users = await User.find({ uuid: { $in: uuids } }).lean();
  const map = new Map(users.map((u) => [u.uuid, u]));

  const leaderboard = agg.map((r) => ({
    uuid: r._id,
    name: map.get(r._id)?.name || r._id,
    groupKey: map.get(r._id)?.groupKey || null,
    total: r.total || 0,
  }));

  res.json({ leaderboard });
});

// GET /api/asian-paint/leaderboard/grouped?day=day2|day3
router.get('/leaderboard/grouped', async (req, res) => {
  const day = String(req.query.day || 'day2');
  const s = await AdminSettings.findOne();
  const options = s?.groups?.[day] || [];

  // Sum by groupKey for the day
  const agg = await Submission.aggregate([
    { $match: { day } },
    {
      $lookup: {
        from: 'users',
        localField: 'uuid',
        foreignField: 'uuid',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $group: { _id: '$user.groupKey', total: { $sum: '$score' } } },
  ]);
  const totals = new Map(agg.map((r) => [r._id || null, r.total]));

  // For members per group (optional, small list)
  const membersAgg = await Submission.aggregate([
    { $match: { day } },
    { $group: { _id: { uuid: '$uuid' }, total: { $sum: '$score' } } },
    {
      $lookup: {
        from: 'users',
        localField: '_id.uuid',
        foreignField: 'uuid',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $project: { uuid: '$_id.uuid', total: 1, name: '$user.name', groupKey: '$user.groupKey' } },
  ]);

  const byGroup = new Map();
  for (const m of membersAgg) {
    const key = m.groupKey || null;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push({ uuid: m.uuid, name: m.name, total: m.total });
  }

  const groups = options.map((g) => ({
    groupKey: g.key,
    label: g.label,
    logo: g.logo,
    total: totals.get(g.key) || 0,
    members: (byGroup.get(g.key) || []).sort((a, b) => b.total - a.total),
  }));

  res.json({ groups });
});

export default router;

