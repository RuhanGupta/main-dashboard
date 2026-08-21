import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Assignment } from '@/models/Assignment';
import { Project } from '@/models/Project';
import { Workout } from '@/models/Workout';
import { AcademicRecurringTask } from '@/models/AcademicRecurringTask';
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { requireCurrentUser, withRouteErrorHandling } from '@/lib/api-helpers';

type ProjectTaskRecord = {
  dueDate?: Date | string;
  [key: string]: unknown;
};

export const GET = withRouteErrorHandling(async () => {
  const today = new Date();
  const start = subDays(startOfDay(today), 2);
  const end = addDays(endOfDay(today), 4);

  const authResult = await requireCurrentUser();
  if (authResult.response) {
    // The dashboard renders an empty week rather than erroring when signed out.
    return NextResponse.json({
      assignments: [],
      projectTasks: [],
      workouts: [],
      academicRecurringTasks: [],
      windowStart: start,
      windowEnd: end,
    });
  }
  const user = authResult.user;

  await connectToDatabase();

  const [assignments, projects, workouts, academicRecurringTasks] = await Promise.all([
    Assignment.find({ userId: user.id, dueDate: { $gte: start, $lte: end } }).sort({ dueDate: 1 }).lean(),
    Project.find({ userId: user.id, 'tasks.dueDate': { $gte: start, $lte: end } }).sort({ dueDate: 1 }).lean(),
    Workout.find({ userId: user.id, date: { $gte: start, $lte: end } }).sort({ date: 1 }).lean(),
    // Recurring tasks are weekday-based, not date-bound — return all active ones
    // so the week view can place them on any navigated week.
    AcademicRecurringTask.find({ userId: user.id, active: true }).sort({ dayOfWeek: 1, startTime: 1 }).lean(),
  ]);

  const projectTasksInWindow = projects.flatMap(p =>
    (p.tasks as ProjectTaskRecord[])
      .filter(t => t.dueDate && new Date(t.dueDate) >= start && new Date(t.dueDate) <= end)
      .map(t => ({ ...t, projectId: p._id, projectTitle: p.title }))
  );

  return NextResponse.json({
    assignments,
    projectTasks: projectTasksInWindow,
    workouts,
    academicRecurringTasks,
    windowStart: start,
    windowEnd: end,
  });
});
