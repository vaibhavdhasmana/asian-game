const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true,
  },
  users: [
    {
      type: String, // UUIDs
      required: true,
    },
  ],
  totalScore: {
    type: Number,
    default: 0,
  },
});

const groupsSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["day2", "day3"],
      required: true,
      unique: true,
    },
    groups: [groupSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Groups", groupsSchema);
