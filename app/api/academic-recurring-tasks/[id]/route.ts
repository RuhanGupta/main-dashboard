import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { AcademicRecurringTask } from '@/models/AcademicRecurringTask';
import {
  readJsonBody,
  removeClientManagedFields,
  requireCurrentUser,
} from '@/lib/api-helpers';

type RecurringTaskBody = {
  _id?: unknown;
  userId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
};

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const task = await AcademicRecurringTask.findOne({ _id: id, userId: authResult.user.id });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const parsed_body = await readJsonBody<RecurringTaskBody>(req);
  if (parsed_body.response) return parsed_body.response;
  const body = parsed_body.body;
  removeClientManagedFields(body);
  const task = await AcademicRecurringTask.findOneAndUpdate(
    { _id: id, userId: authResult.user.id },
    { ...body, userId: authResult.user.id },
    { new: true }
  );
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const task = await AcademicRecurringTask.findOneAndDelete({ _id: id, userId: authResult.user.id });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
