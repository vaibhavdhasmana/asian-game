import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    logo: { type: String, default: '' },
  },
  { _id: false }
);

const AdminSettingsSchema = new mongoose.Schema(
  {
    currentDay: { type: String, enum: ['day1', 'day2', 'day3', 'day4'], default: 'day1' },
    currentSlot: { type: Number, default: 1 },
    slotsPerDay: {
      day1: { type: Number, default: 1 },
      day2: { type: Number, default: 1 },
      day3: { type: Number, default: 1 },
      day4: { type: Number, default: 1 },
    },
    groups: {
      day2: { type: [GroupSchema], default: [] },
      day3: { type: [GroupSchema], default: [] },
      day4: { type: [GroupSchema], default: [] },
    },
  },
  { timestamps: true }
);

export default mongoose.model('AdminSettings', AdminSettingsSchema);
