import { Schema, model, models } from 'mongoose';

const CompletionRecordSchema = new Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    completedAt: Date,
    notes: String,
  },
  { _id: false }
);

const AcademicRecurringTaskSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    subject: { type: String, default: 'Other' },
    dayOfWeek: { type: Number, required: true }, // 0-6 (Sun-Sat)
    startTime: String, // HH:mm
    endTime: String, // HH:mm
    notes: String,
    active: { type: Boolean, default: true },
    completionLog: [CompletionRecordSchema],
  },
  { timestamps: true }
);

export const AcademicRecurringTask =
  models.AcademicRecurringTask ?? model('AcademicRecurringTask', AcademicRecurringTaskSchema);
