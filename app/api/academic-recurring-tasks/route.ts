import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { AcademicRecurringTask } from '@/models/AcademicRecurringTask';
import { emptyListResponse, removeClientManagedFields, requireCurrentUser } from '@/lib/api-helpers';

type RecurringTaskBody = {
  _id?: unknown;
  userId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  googleTaskId?: unknown;
  [key: string]: unknown;
};

export async function GET(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const query: Record<string, unknown> = { userId: authResult.user.id, active: true };

  // Recurring tasks are weekday-based. When a date range is supplied, only
  // return tasks whose dayOfWeek falls within the range. A full week (7 days)
  // naturally includes every weekday, so this is a no-op for week views.
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const spanDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000);
    if (spanDays < 6) {
      const daysInRange = new Set<number>();
      for (let i = 0; i <= spanDays; i++) {
        daysInRange.add(new Date(startDate.getTime() + i * 86400000).getDay());
      }
      query.dayOfWeek = { $in: Array.from(daysInRange) };
    }
  }

  const tasks = await AcademicRecurringTask.find(query).sort({ dayOfWeek: 1, startTime: 1 });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const body = (await req.json()) as RecurringTaskBody;
  removeClientManagedFields(body);
  const task = await AcademicRecurringTask.create({ ...body, userId: authResult.user.id });
  return NextResponse.json(task, { status: 201 });
}
