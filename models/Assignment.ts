import { Schema, model, models } from 'mongoose';

const LinkSchema = new Schema({ title: String, url: String });

const SubtaskSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  startDate: Date,
  dueDate: Date,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'cancelled'], default: 'not_started' },
  notes: String,
  completed: { type: Boolean, default: false },
  counselorVisible: { type: Boolean, default: true },
}, { timestamps: true });

const AssignmentSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  course: { type: String, required: true },
  startDate: Date,
  dueDate: Date,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'cancelled'], default: 'not_started' },
  notes: String,
  links: [LinkSchema],
  subtasks: [SubtaskSchema],
  counselorVisible: { type: Boolean, default: true },
}, { timestamps: true });

// Every list query filters by userId and sorts by dueDate; without the compound
// index Mongo scans the whole userId partition and sorts in memory.
AssignmentSchema.index({ userId: 1, dueDate: 1 });

export const Assignment = models.Assignment ?? model('Assignment', AssignmentSchema);
