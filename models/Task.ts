import { Schema, model, models } from 'mongoose';

const SubtaskSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'cancelled'], default: 'not_started' },
  notes: String,
  completed: { type: Boolean, default: false },
}, { timestamps: true });

const TaskSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: String,
  domain: { type: String, enum: ['academic', 'extracurricular', 'body', 'reflection'], required: true },
  parentId: String,
  parentType: String,
  dueDate: Date,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'cancelled'], default: 'not_started' },
  notes: String,
  subtasks: [SubtaskSchema],
}, { timestamps: true });

export const Task = models.Task ?? model('Task', TaskSchema);
export const SubtaskModel = models.Subtask ?? model('Subtask', SubtaskSchema);
