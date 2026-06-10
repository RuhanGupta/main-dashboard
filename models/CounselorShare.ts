import { Schema, model, models } from 'mongoose';

const CounselorShareSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
}, { timestamps: true });

export const CounselorShare = models.CounselorShare ?? model('CounselorShare', CounselorShareSchema);
