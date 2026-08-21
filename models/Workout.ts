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

// Calendar reads are always {userId, date-range} sorted by date.
WorkoutSchema.index({ userId: 1, date: 1 });
WorkoutSchema.index({ userId: 1, isRecurring: 1, date: -1 });

// A recurring series can only have one occurrence per date. This is the
// database-level guarantee behind the upserts in the workouts route — two
// concurrent page loads previously each inserted their own copy of the same
// occurrence, which left real duplicates in the collection.
WorkoutSchema.index(
  { userId: 1, recurringGroupId: 1, date: 1 },
  { unique: true, partialFilterExpression: { recurringGroupId: { $type: 'string' } }, name: 'uniq_recurring_occurrence' }
);

export const Workout = models.Workout ?? model('Workout', WorkoutSchema);
