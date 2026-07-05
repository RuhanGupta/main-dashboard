import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { BodyGoal } from '@/models/BodyGoal';
import {
  googleSyncErrorResponse,
  hasOwn,
  normalizeDateInput,
  removeClientManagedFields,
  requireCurrentUser,
} from '@/lib/api-helpers';
import { buildTaskNotes, upsertTask, deleteTask } from '@/lib/google-tasks';

type DateInput = Date | string | null | undefined;
type IdLike = string | { toString(): string };

type BodyGoalBody = {
  _id?: unknown;
  title?: string;
  notes?: string | null;
  status?: string;
  dueDate?: DateInput;
  subtasks?: unknown[];
  googleTaskId?: string | null;
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type BodyGoalRecord = Required<Pick<BodyGoalBody, 'title'>> & {
  _id: IdLike;
  userId: string;
  notes?: string | null;
  status?: string;
  dueDate?: DateInput;
  googleTaskId?: string | null;
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const body = (await req.json()) as BodyGoalBody;
  removeClientManagedFields(body);
  body.dueDate = normalizeDateInput(body.dueDate);
  body.userId = authResult.user.id;

  const existing = (await BodyGoal.findOne({ _id: id, userId: authResult.user.id }).lean()) as BodyGoalRecord | null;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (authResult.user.accessToken) {
    try {
      const dueDate = hasOwn(body, 'dueDate') ? body.dueDate : existing.dueDate;

      if (dueDate || existing.googleTaskId) {
        const result = await upsertTask(authResult.user.accessToken, existing.googleTaskId, {
          title: `💪 ${body.title ?? existing.title}`,
          notes: buildTaskNotes(body.notes ?? existing.notes, `body-goal:${id}`),
          dueDate,
          completed: (body.status ?? existing.status) === 'completed',
        });
        body.googleTaskId = result.id;
      }
    } catch (error) {
      return googleSyncErrorResponse(error);
    }
  }

  const goal = await BodyGoal.findOneAndUpdate(
    { _id: id, userId: authResult.user.id },
    body,
    { new: true }
  ).lean();
  return NextResponse.json(goal);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;

  const existing = (await BodyGoal.findOne({ _id: id, userId: authResult.user.id }).lean()) as BodyGoalRecord | null;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (authResult.user.accessToken && existing.googleTaskId) {
    try {
      await deleteTask(authResult.user.accessToken, existing.googleTaskId);
    } catch (error) {
      return googleSyncErrorResponse(error);
    }
  }

  await BodyGoal.findOneAndDelete({ _id: id, userId: authResult.user.id });
  return NextResponse.json({ success: true });
}
