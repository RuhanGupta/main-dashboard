import { Schema, model, models } from 'mongoose';

const DailyFocusItemSchema = new Schema({
  sourceType: {
    type: String,
    enum: ['assignment_subtask', 'project_task', 'body_goal_subtask', 'quick_task'],
    required: true,
  },
  sourceId:    { type: String, required: true }, // _id of the subtask / task (or self for quick_task)
  parentId:    { type: String, default: '' },    // _id of the assignment / project / body goal (empty for quick_task)
  title:       { type: String, required: true }, // cached for display
  parentTitle: { type: String, default: '' },    // cached for context line
  startDate:   { type: Date,   default: null },
  dueDate:     { type: Date,   default: null },
  completed:   { type: Boolean, default: false },
  addedAt:     { type: Date,    default: Date.now },
});

const DailyFocusSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  items:  [DailyFocusItemSchema],
}, { timestamps: true });

export const DailyFocus = models.DailyFocus ?? model('DailyFocus', DailyFocusSchema);
