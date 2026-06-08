import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Habit } from '@/models/Habit';
import { emptyListResponse, removeClientManagedFields, requireCurrentUser } from '@/lib/api-helpers';

type HabitBody = {
  _id?: unknown;
  userId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  googleTaskId?: unknown;
  [key: string]: unknown;
};

export async function GET() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const habits = await Habit.find({ userId: authResult.user.id }).sort({ createdAt: 1 });
  return NextResponse.json(habits);
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const body = (await req.json()) as HabitBody;
  removeClientManagedFields(body);
  const habit = await Habit.create({ ...body, userId: authResult.user.id });
  return NextResponse.json(habit, { status: 201 });
}
