const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    currentDay: {
      type: String,
      enum: ["day1", "day2", "day3"],
      default: "day1",
    },
    groupsColors: {
      day2: [{ type: String }],
      day3: [{ type: String }],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// Ensure only one settings document exists
settingsSchema.pre("save", async function (next) {
  if (this.isNew) {
    const existing = await this.constructor.findOne();
    if (existing) {
      throw new Error("Only one settings document can exist");
    }
  }
  next();
});

module.exports = mongoose.model("Settings", settingsSchema);
