import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Assignment } from '@/models/Assignment';
import { Project } from '@/models/Project';
import { Workout } from '@/models/Workout';
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { getCurrentUser } from '@/lib/auth';

type ProjectTaskRecord = {
  dueDate?: Date | string;
  toObject(): Record<string, unknown>;
};

export async function GET() {
  const user = await getCurrentUser();

  await connectToDatabase();

  const today = new Date();
  const start = subDays(startOfDay(today), 2);
  const end = addDays(endOfDay(today), 4);

  if (!user) {
    return NextResponse.json({
      assignments: [],
      projectTasks: [],
      workouts: [],
      windowStart: start,
      windowEnd: end,
    });
  }

  const [assignments, projects, workouts] = await Promise.all([
    Assignment.find({ userId: user.id, dueDate: { $gte: start, $lte: end } }).sort({ dueDate: 1 }),
    Project.find({ userId: user.id, 'tasks.dueDate': { $gte: start, $lte: end } }).sort({ dueDate: 1 }),
    Workout.find({ userId: user.id, date: { $gte: start, $lte: end } }).sort({ date: 1 }),
  ]);

  const projectTasksInWindow = projects.flatMap(p =>
    (p.tasks as ProjectTaskRecord[])
      .filter(t => t.dueDate && new Date(t.dueDate) >= start && new Date(t.dueDate) <= end)
      .map(t => ({ ...t.toObject(), projectId: p._id, projectTitle: p.title }))
  );

  return NextResponse.json({
    assignments,
    projectTasks: projectTasksInWindow,
    workouts,
    windowStart: start,
    windowEnd: end,
  });
}
