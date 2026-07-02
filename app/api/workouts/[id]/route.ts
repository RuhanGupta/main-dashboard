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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope'); // 'future' deletes this + all later occurrences in the series

  const workout = await Workout.findOne({ _id: id, userId: authResult.user.id });
  if (!workout) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (scope === 'future' && workout.isRecurring && workout.recurringGroupId) {
    await Workout.deleteMany({
      userId: authResult.user.id,
      recurringGroupId: workout.recurringGroupId,
      date: { $gte: workout.date },
    });
    // Stop the series from regenerating: clear the recurring flag on any
    // remaining (earlier) occurrences so future fetches don't re-create it.
    await Workout.updateMany(
      { userId: authResult.user.id, recurringGroupId: workout.recurringGroupId },
      { isRecurring: false }
    );
  } else {
    await Workout.deleteOne({ _id: id, userId: authResult.user.id });
  }
  return NextResponse.json({ success: true });
}
