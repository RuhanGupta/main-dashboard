import { cache } from 'react';
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { connectToDatabase } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';
import { Assignment } from '@/models/Assignment';
import { AcademicRecurringTask } from '@/models/AcademicRecurringTask';
import { Workout } from '@/models/Workout';
import { Project } from '@/models/Project';
import { BodyGoal } from '@/models/BodyGoal';
import { DailyFocus } from '@/models/DailyFocus';
import type { IAssignment, IAcademicRecurringTask, IWorkout, IProject, IDailyFocusItem } from '@/types';
import type { IBodyGoalLike } from '@/lib/timeline';
import type { RecurringWorkoutSeries } from '@/components/timeline/RecurringPanel';

/**
 * Server-side reads used to render pages with their data already present.
 *
 * Previously every page was a client component that fetched in `useEffect`, so
 * nothing was requested until the JS bundle had downloaded, parsed and
 * hydrated — the database round trip only started once the page was already
 * interactive. These run during the server render instead, which removes a
 * whole network round trip (plus a cold Mongo connect) from every navigation.
 *
 * Each is wrapped in `React.cache` so a layout and a page reading the same data
 * in one request share a single query.
 */

/**
 * Server Components may only pass JSON-serializable props to Client Components,
 * and `.lean()` documents still contain ObjectId and Date instances. This gives
 * the client the exact shape it used to receive from `NextResponse.json()`.
 */
function serialize<T>(docs: unknown): T {
  return JSON.parse(JSON.stringify(docs)) as T;
}

export const getSessionUser = cache(async () => getCurrentUser());

export const getAssignments = cache(async (): Promise<IAssignment[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  await connectToDatabase();
  const assignments = await Assignment.find({ userId: user.id }).sort({ dueDate: 1 }).lean();
  return serialize<IAssignment[]>(assignments);
});

export const getAcademicRecurringTasks = cache(async (): Promise<IAcademicRecurringTask[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  await connectToDatabase();
  const tasks = await AcademicRecurringTask.find({ userId: user.id, active: true })
    .sort({ dayOfWeek: 1, startTime: 1 })
    .lean();
  return serialize<IAcademicRecurringTask[]>(tasks);
});

export const getProjects = cache(async (): Promise<IProject[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  await connectToDatabase();
  const projects = await Project.find({ userId: user.id }).sort({ dueDate: 1 }).lean();
  return serialize<IProject[]>(projects);
});

export type DashboardWindow = {
  assignments: IAssignment[];
  projectTasks: Array<{ _id: string; title: string; dueDate?: string; projectTitle?: string; priority?: string; status?: string }>;
  workouts: Array<{ _id: string; title: string; date: string; exercises?: unknown[]; completed?: boolean }>;
  academicRecurringTasks: IAcademicRecurringTask[];
  windowStart: string;
  windowEnd: string;
};

/** The rolling −2/+4 day window the dashboard header and calendar render. */
export const getDashboardWindow = cache(async (): Promise<DashboardWindow> => {
  const today = new Date();
  const start = subDays(startOfDay(today), 2);
  const end = addDays(endOfDay(today), 4);

  const empty: DashboardWindow = {
    assignments: [], projectTasks: [], workouts: [], academicRecurringTasks: [],
    windowStart: start.toISOString(), windowEnd: end.toISOString(),
  };

  const user = await getSessionUser();
  if (!user) return empty;

  await connectToDatabase();
  const [assignments, projects, workouts, academicRecurringTasks] = await Promise.all([
    Assignment.find({ userId: user.id, dueDate: { $gte: start, $lte: end } }).sort({ dueDate: 1 }).lean(),
    Project.find({ userId: user.id, 'tasks.dueDate': { $gte: start, $lte: end } }).sort({ dueDate: 1 }).lean(),
    Workout.find({ userId: user.id, date: { $gte: start, $lte: end } }).sort({ date: 1 }).lean(),
    // Recurring tasks are weekday-based, not date-bound — return all active ones
    // so the week view can place them on any navigated week.
    AcademicRecurringTask.find({ userId: user.id, active: true }).sort({ dayOfWeek: 1, startTime: 1 }).lean(),
  ]);

  const projectTasks = (projects as Array<{ _id: unknown; title: string; tasks?: Array<{ dueDate?: Date | string }> }>).flatMap(p =>
    (p.tasks ?? [])
      .filter(t => t.dueDate && new Date(t.dueDate) >= start && new Date(t.dueDate) <= end)
      .map(t => ({ ...t, projectId: p._id, projectTitle: p.title }))
  );

  return serialize<DashboardWindow>({
    assignments,
    projectTasks,
    workouts,
    academicRecurringTasks,
    windowStart: start,
    windowEnd: end,
  });
});

export const getDailyFocusItems = cache(async (): Promise<IDailyFocusItem[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  await connectToDatabase();
  const doc = await DailyFocus.findOne({ userId: user.id }).lean() as { items?: IDailyFocusItem[] } | null;
  return serialize<IDailyFocusItem[]>(doc?.items ?? []);
});

export const getBodyGoals = cache(async (): Promise<IBodyGoalLike[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  await connectToDatabase();
  const goals = await BodyGoal.find({ userId: user.id }).sort({ dueDate: 1 }).lean();
  return serialize<IBodyGoalLike[]>(goals);
});

/**
 * Repeating workouts collapsed back into one row per series. Occurrences are
 * stored as independent documents per day, so the raw collection would show
 * the same workout dozens of times; the recurring panel wants the schedule.
 */
export const getRecurringWorkoutSeries = cache(async (): Promise<RecurringWorkoutSeries[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  await connectToDatabase();
  const series = await Workout.aggregate<{
    _id: string;
    title: string;
    recurrenceFrequency: 'daily' | 'weekly';
    dayOfWeek: number | null;
    exerciseCount: number;
  }>([
    { $match: { userId: user.id, isRecurring: true, recurringGroupId: { $type: 'string' } } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: '$recurringGroupId',
        title: { $first: '$title' },
        recurrenceFrequency: { $first: '$recurrenceFrequency' },
        dayOfWeek: { $first: '$dayOfWeek' },
        exerciseCount: { $first: { $size: { $ifNull: ['$exercises', []] } } },
      },
    },
  ]);

  return series.map(s => ({
    id: String(s._id),
    title: s.title,
    frequency: s.recurrenceFrequency === 'daily' ? 'daily' : 'weekly',
    dayOfWeek: s.recurrenceFrequency === 'daily' ? null : (s.dayOfWeek ?? null),
    exerciseCount: s.exerciseCount ?? 0,
  }));
});

/**
 * Workouts for a date range. This deliberately does NOT generate missing
 * recurring occurrences — that write path stays on the API route so a page
 * render never performs writes.
 */
export const getWorkoutsInRange = cache(async (startIso: string, endIso: string): Promise<IWorkout[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  await connectToDatabase();
  const workouts = await Workout.find({
    userId: user.id,
    date: { $gte: new Date(startIso), $lte: new Date(endIso) },
  })
    .sort({ date: 1 })
    .lean();
  return serialize<IWorkout[]>(workouts);
});
