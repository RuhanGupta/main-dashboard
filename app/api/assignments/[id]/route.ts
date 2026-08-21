import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Assignment } from '@/models/Assignment';
import {
  hasOwn,
  normalizeDateInput,
  readJsonBody,
  removeClientManagedFields,
  requireCurrentUser,
  toIdString,
} from '@/lib/api-helpers';

type DateInput = Date | string | null | undefined;
type IdLike = string | { toString(): string };

type AssignmentSubtaskBody = {
  _id?: IdLike;
  title: string;
  description?: string;
  startDate?: DateInput;
  dueDate?: DateInput;
  priority?: string;
  status?: string;
  notes?: string | null;
  completed?: boolean;
};

type AssignmentBody = {
  _id?: unknown;
  title?: string;
  course?: string;
  startDate?: DateInput;
  dueDate?: DateInput;
  priority?: string;
  status?: string;
  notes?: string | null;
  links?: unknown[];
  subtasks?: AssignmentSubtaskBody[];
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type AssignmentRecord = Required<Pick<AssignmentBody, 'title' | 'course'>> & {
  _id: IdLike;
  userId: string;
  dueDate?: DateInput;
  status?: string;
  notes?: string | null;
  subtasks: AssignmentSubtaskBody[];
};

function normalizeSubtask(subtask: AssignmentSubtaskBody): AssignmentSubtaskBody {
  return {
    ...subtask,
    startDate: normalizeDateInput(subtask.startDate),
    dueDate: normalizeDateInput(subtask.dueDate),
  };
}

function normalizeAssignmentBody(body: AssignmentBody): AssignmentBody {
  return {
    ...body,
    startDate: normalizeDateInput(body.startDate),
    dueDate: normalizeDateInput(body.dueDate),
    subtasks: Array.isArray(body.subtasks) ? body.subtasks.map(normalizeSubtask) : body.subtasks,
  };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const assignment = await Assignment.findOne({ _id: id, userId: authResult.user.id }).lean();
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(assignment);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const parsed = await readJsonBody<AssignmentBody>(req);
  if (parsed.response) return parsed.response;
  const body = normalizeAssignmentBody(parsed.body);
  removeClientManagedFields(body);
  body.userId = authResult.user.id;

  const existing = (await Assignment.findOne({ _id: id, userId: authResult.user.id }).lean()) as AssignmentRecord | null;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const nowCompleted = (body.status ?? existing.status) === 'completed';
  const justCompleted = body.status === 'completed' && existing.status !== 'completed';

  if (justCompleted) {
    const subs = body.subtasks ?? existing.subtasks;
    body.subtasks = subs.map(s => ({ ...s, completed: true }));
  }

  await Assignment.collection.updateOne(
    { _id: new Types.ObjectId(id), userId: authResult.user.id },
    { $set: body }
  );
  const updated = await Assignment.findOne({ _id: id, userId: authResult.user.id }).lean();
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const existing = (await Assignment.findOne({ _id: id, userId: authResult.user.id }).lean()) as AssignmentRecord | null;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await Assignment.findOneAndDelete({ _id: id, userId: authResult.user.id });
  return NextResponse.json({ success: true });
}
