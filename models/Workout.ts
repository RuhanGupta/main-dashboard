import { Schema, model, models } from 'mongoose';

const WeightEntrySchema = new Schema({
  date: String,
  weight: String,
  reps: String,
});

const ExerciseSchema = new Schema({
  name: { type: String, required: true },
  sets: Number,
  reps: String,
  weight: String,
  duration: String,
  notes: String,
  formTips: String,
  previousWeights: [WeightEntrySchema],
});

const WorkoutSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  dayOfWeek: Number,
  exercises: [ExerciseSchema],
  notes: String,
  completed: { type: Boolean, default: false },
  isRecurring: { type: Boolean, default: false },
  recurringGroupId: { type: String, index: true },
  recurrenceFrequency: { type: String, enum: ['daily', 'weekly'] },
}, { timestamps: true });

export const Workout = models.Workout ?? model('Workout', WorkoutSchema);
