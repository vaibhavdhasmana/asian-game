import mongoose from 'mongoose';

const GameContentSchema = new mongoose.Schema(
  {
    day: { type: String, enum: ['day1', 'day2', 'day3'], required: true, index: true },
    game: { type: String, enum: ['quiz', 'crossword', 'wordSearch', 'jigsaw'], required: true, index: true },
    groupKey: { type: String, default: null, index: true }, // null = general content
    version: { type: Number, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

GameContentSchema.index({ day: 1, game: 1, groupKey: 1, version: -1 });

export default mongoose.model('GameContent', GameContentSchema);

