import { Schema, model, models } from 'mongoose';

const CompletionSchema = new Schema({
  date: { type: String, required: true },
  completed: { type: Boolean, default: true },
});

const HabitSchema = new Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  color: { type: String, default: '#6366f1' },
  icon: String,
  completions: [CompletionSchema],
  streak: { type: Number, default: 0 },
}, { timestamps: true });

HabitSchema.index({ userId: 1, createdAt: 1 });

export const Habit = models.Habit ?? model('Habit', HabitSchema);
