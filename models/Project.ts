import { Schema, model, models } from 'mongoose';

const LinkSchema = new Schema({ title: String, url: String });

const SubtaskSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'cancelled'], default: 'not_started' },
  notes: String,
  googleTaskId: String,
  completed: { type: Boolean, default: false },
}, { timestamps: true });

const TaskSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'cancelled'], default: 'not_started' },
  notes: String,
  subtasks: [SubtaskSchema],
  googleTaskId: String,
  counselorVisible: { type: Boolean, default: true },
}, { timestamps: true });

const ProjectSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'cancelled'], default: 'not_started' },
  notes: String,
  links: [LinkSchema],
  tasks: [TaskSchema],
  googleTaskId: String,
  counselorVisible: { type: Boolean, default: true },
}, { timestamps: true });

export const Project = models.Project ?? model('Project', ProjectSchema);
