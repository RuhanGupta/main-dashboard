import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { Workout } from '@/models/Workout';
import {
  emptyListResponse,
  readJsonBody,
  removeClientManagedFields,
  requireCurrentUser,
  withRouteErrorHandling,
} from '@/lib/api-helpers';

type WorkoutBody = {
  _id?: unknown;
  userId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
};

// Never generate occurrences further out than this, however far ahead the
// caller's `end` param points — otherwise a single crafted request can make the
// server write unbounded documents.
const MAX_HORIZON_DAYS = 120;
// Belt-and-braces cap per series in case a bad date makes the step loop stall.
const MAX_OCCURRENCES_PER_SERIES = 200;

// Recurring workouts (daily or weekly) are stored as independent documents per
// occurrence (so completion/edits don't leak across days/weeks). This fills in
// any missing future occurrences, up to `end`, based on the most recent
// occurrence in each series.
async function ensureRecurringOccurrences(userId: string, end: Date) {
  const maxEnd = new Date(Date.now() + MAX_HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const horizon = end > maxEnd ? maxEnd : end;

  const groups = await Workout.aggregate([
    { $match: { userId, isRecurring: true, recurringGroupId: { $exists: true, $ne: null } } },
    { $sort: { date: -1 } },
    { $group: { _id: '$recurringGroupId', latest: { $first: '$$ROOT' } } },
  ]);

  type UpsertOp = Parameters<typeof Workout.bulkWrite>[0][number];
  const ops: UpsertOp[] = [];

  for (const g of groups) {
    const latest = g.latest;
    const stepDays = latest.recurrenceFrequency === 'daily' ? 1 : 7;
    const nextDate = new Date(latest.date);
    nextDate.setDate(nextDate.getDate() + stepDays);

    for (let i = 0; nextDate <= horizon && i < MAX_OCCURRENCES_PER_SERIES; i++) {
      const date = new Date(nextDate);
      // Upsert rather than insert: two concurrent page loads used to race here
      // and each create their own copy of the same occurrence.
      ops.push({
        updateOne: {
          filter: { userId, recurringGroupId: latest.recurringGroupId, date },
          update: {
            $setOnInsert: {
              userId,
              title: latest.title,
              date,
              dayOfWeek: date.getDay(),
              exercises: latest.exercises,
              notes: latest.notes,
              completed: false,
              isRecurring: true,
              recurringGroupId: latest.recurringGroupId,
              recurrenceFrequency: latest.recurrenceFrequency,
            },
          },
          upsert: true,
        },
      });
      nextDate.setDate(nextDate.getDate() + stepDays);
    }
  }

  // One round trip for every series instead of one per occurrence — and no round
  // trip at all on the common case where the series are already up to date.
  if (ops.length > 0) {
    try {
      await Workout.bulkWrite(ops, { ordered: false });
    } catch (error) {
      // A concurrent request may win the race for the same occurrence. The
      // unique index rejects the loser, which is the correct outcome — the
      // document exists either way, so this isn't a failure worth surfacing.
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { code?: number; writeErrors?: { code?: number }[] };
  if (err.code === 11000) return true;
  return Array.isArray(err.writeErrors) && err.writeErrors.every(e => e?.code === 11000);
}

/** Parse a query-param date, returning null for missing or unparseable values. */
function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const GET = withRouteErrorHandling(async (req: NextRequest) => {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const start = parseDateParam(searchParams.get('start'));
  const end = parseDateParam(searchParams.get('end'));

  if (end) {
    await ensureRecurringOccurrences(authResult.user.id, end);
  }

  const query: Record<string, unknown> = { userId: authResult.user.id };
  if (start && end) {
    query.date = { $gte: start, $lte: end };
  }

  const workouts = await Workout.find(query).sort({ date: 1 }).lean();
  return NextResponse.json(workouts);
});

export const POST = withRouteErrorHandling(async (req: NextRequest) => {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const parsed = await readJsonBody<WorkoutBody>(req);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
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
});
