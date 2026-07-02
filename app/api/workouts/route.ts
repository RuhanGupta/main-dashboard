import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { Workout } from '@/models/Workout';
import { emptyListResponse, removeClientManagedFields, requireCurrentUser } from '@/lib/api-helpers';

type WorkoutBody = {
  _id?: unknown;
  userId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  googleTaskId?: unknown;
  [key: string]: unknown;
};

// Recurring workouts (daily or weekly) are stored as independent documents per
// occurrence (so completion/edits don't leak across days/weeks). This fills in
// any missing future occurrences, up to `end`, based on the most recent
// occurrence in each series.
async function ensureRecurringOccurrences(userId: string, end: Date) {
  const groups = await Workout.aggregate([
    { $match: { userId, isRecurring: true, recurringGroupId: { $exists: true, $ne: null } } },
    { $sort: { date: -1 } },
    { $group: { _id: '$recurringGroupId', latest: { $first: '$$ROOT' } } },
  ]);

  for (const g of groups) {
    const latest = g.latest;
    const stepDays = latest.recurrenceFrequency === 'daily' ? 1 : 7;
    const nextDate = new Date(latest.date);
    nextDate.setDate(nextDate.getDate() + stepDays);
    while (nextDate <= end) {
      await Workout.create({
        userId,
        title: latest.title,
        date: new Date(nextDate),
        dayOfWeek: nextDate.getDay(),
        exercises: latest.exercises,
        notes: latest.notes,
        completed: false,
        isRecurring: true,
        recurringGroupId: latest.recurringGroupId,
        recurrenceFrequency: latest.recurrenceFrequency,
      });
      nextDate.setDate(nextDate.getDate() + stepDays);
    }
  }
}

export async function GET(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (end) {
    await ensureRecurringOccurrences(authResult.user.id, new Date(end));
  }

  const query: Record<string, unknown> = { userId: authResult.user.id };
  if (start && end) {
    query.date = { $gte: new Date(start), $lte: new Date(end) };
  }

  const workouts = await Workout.find(query).sort({ date: 1 });
  return NextResponse.json(workouts);
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const body = (await req.json()) as WorkoutBody;
  removeClientManagedFields(body);
  const { repeatWeekly, repeatFrequency, ...rest } = body;
  // repeatWeekly is kept for backwards compatibility with older clients
  const frequency = repeatFrequency === 'daily' || repeatFrequency === 'weekly'
    ? repeatFrequency
    : repeatWeekly ? 'weekly' : undefined;

  const workout = await Workout.create({
    ...rest,
    userId: authResult.user.id,
    isRecurring: !!frequency,
    recurringGroupId: frequency ? randomUUID() : undefined,
    recurrenceFrequency: frequency,
  });
  return NextResponse.json(workout, { status: 201 });
}
