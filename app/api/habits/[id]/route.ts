import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Habit } from '@/models/Habit';
import {
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const parsed_body = await readJsonBody<HabitBody>(req);
  if (parsed_body.response) return parsed_body.response;
  const body = parsed_body.body;
  removeClientManagedFields(body);
  const habit = await Habit.findOneAndUpdate(
    { _id: id, userId: authResult.user.id },
    { ...body, userId: authResult.user.id },
    { new: true }
  );
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(habit);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const habit = await Habit.findOneAndDelete({ _id: id, userId: authResult.user.id });
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
