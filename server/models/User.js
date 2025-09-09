import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    groupKey: { type: String, default: null },
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
