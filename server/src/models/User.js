const mongoose = require("mongoose");

const scoreSchema = new mongoose.Schema({
  day1: { type: Number, default: 0 },
  day2: { type: Number, default: 0 },
  day3: { type: Number, default: 0 },
});

const userSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      quiz: scoreSchema,
      crossword: scoreSchema,
      wordSearch: scoreSchema,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
userSchema.index({ uuid: 1 });

module.exports = mongoose.model("User", userSchema);
