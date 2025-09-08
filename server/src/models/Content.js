const mongoose = require("mongoose");

const contentSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["day1", "day2", "day3"],
      required: true,
    },
    game: {
      type: String,
      enum: ["quiz", "crossword", "wordSearch"],
      required: true,
    },
    group: {
      type: String,
      default: "default",
    },
    version: {
      type: Number,
      default: 1,
    },
    data: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: { createdAt: "uploadedAt" },
  }
);

// Compound index for efficient queries
contentSchema.index({ day: 1, game: 1, group: 1, version: -1 });

module.exports = mongoose.model("Content", contentSchema);
