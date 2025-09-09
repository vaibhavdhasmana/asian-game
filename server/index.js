import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import groupRoutes from './routes/group.js';
import contentRoutes from './routes/content.js';
import scoreRoutes from './routes/score.js';
import leaderboardRoutes from './routes/leaderboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/asian_game';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
// Serve uploaded assets (e.g., jigsaw images)
app.use('/uploads', express.static(UPLOAD_DIR));

// Routes
app.use('/api/asian-paint', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/asian-paint', groupRoutes);
app.use('/api/asian-paint', contentRoutes);
app.use('/api/asian-paint', scoreRoutes);
app.use('/api/asian-paint', leaderboardRoutes);

app.get('/', (req, res) => res.json({ ok: true }));

async function start() {
  try {
    await mongoose.connect(MONGO_URI, { autoIndex: true });
    console.log('Mongo connected');
    app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
  } catch (e) {
    console.error('Failed to start server', e);
    process.exit(1);
  }
}

start();
