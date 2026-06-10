import { Schema, model, models } from 'mongoose';

const DailyFocusItemSchema = new Schema({
  sourceType: {
    type: String,
    enum: ['assignment_subtask', 'project_task', 'body_goal_subtask'],
    required: true,
  },
  sourceId:    { type: String, required: true }, // _id of the subtask / task
  parentId:    { type: String, required: true }, // _id of the assignment / project / body goal
  title:       { type: String, required: true }, // cached for display
  parentTitle: { type: String, default: '' },    // cached for context line
  completed:   { type: Boolean, default: false },
  addedAt:     { type: Date,    default: Date.now },
});

const DailyFocusSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  items:  [DailyFocusItemSchema],
}, { timestamps: true });

export const DailyFocus = models.DailyFocus ?? model('DailyFocus', DailyFocusSchema);
