import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: true, index: true },
    day: { type: String, enum: ['day1', 'day2', 'day3'], required: true, index: true },
    game: { type: String, enum: ['quiz', 'crossword', 'wordSearch', 'jigsaw'], required: true, index: true },
    // New: slot number within a day (1..N)
    slot: { type: Number, default: 1, index: true },
    contentVersion: { type: Number, required: true },
    score: { type: Number, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    final: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Unique per user, per day, per game, per slot
SubmissionSchema.index({ uuid: 1, day: 1, game: 1, slot: 1 }, { unique: true });

export default mongoose.model('Submission', SubmissionSchema);
