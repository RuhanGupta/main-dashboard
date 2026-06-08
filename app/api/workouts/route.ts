import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

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
  const workout = await Workout.create({ ...body, userId: authResult.user.id });
  return NextResponse.json(workout, { status: 201 });
}
