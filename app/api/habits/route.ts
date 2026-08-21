import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Habit } from '@/models/Habit';
import {
  emptyListResponse,
  readJsonBody,
  removeClientManagedFields,
  requireCurrentUser,
} from '@/lib/api-helpers';

type HabitBody = {
  _id?: unknown;
  userId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
};

export async function GET() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const habits = await Habit.find({ userId: authResult.user.id }).sort({ createdAt: 1 }).lean();
  return NextResponse.json(habits);
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const parsed_body = await readJsonBody<HabitBody>(req);
  if (parsed_body.response) return parsed_body.response;
  const body = parsed_body.body;
  removeClientManagedFields(body);
  const habit = await Habit.create({ ...body, userId: authResult.user.id });
  return NextResponse.json(habit, { status: 201 });
}
