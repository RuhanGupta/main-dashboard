import { Schema, model, models } from 'mongoose';

const ReflectionSchema = new Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  date: { type: Date, required: true },
  wins: String,
  lessonsLearned: String,
  thingsToImprove: String,
  mood: { type: Number, min: 1, max: 10 },
  journalEntry: String,
}, { timestamps: true });

export const Reflection = models.Reflection ?? model('Reflection', ReflectionSchema);
