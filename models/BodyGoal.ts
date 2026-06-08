import { Schema, model, models } from 'mongoose';

const SubtaskSchema = new Schema({
  title: { type: String, required: true },
  dueDate: Date,
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'cancelled'], default: 'not_started' },
  completed: { type: Boolean, default: false },
  notes: String,
  googleTaskId: String,
});

const BodyGoalSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  notes: String,
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'cancelled'], default: 'not_started' },
  dueDate: Date,
  subtasks: [SubtaskSchema],
  googleTaskId: String,
}, { timestamps: true });

export const BodyGoal = models.BodyGoal ?? model('BodyGoal', BodyGoalSchema);
