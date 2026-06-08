import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Workout } from '@/models/Workout';
import { removeClientManagedFields, requireCurrentUser } from '@/lib/api-helpers';

type WorkoutBody = {
  _id?: unknown;
  userId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  googleTaskId?: unknown;
  [key: string]: unknown;
};

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const workout = await Workout.findOne({ _id: id, userId: authResult.user.id });
  if (!workout) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(workout);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const body = (await req.json()) as WorkoutBody;
  removeClientManagedFields(body);
  const workout = await Workout.findOneAndUpdate(
    { _id: id, userId: authResult.user.id },
    { ...body, userId: authResult.user.id },
    { new: true }
  );
  if (!workout) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(workout);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const workout = await Workout.findOneAndDelete({ _id: id, userId: authResult.user.id });
  if (!workout) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
