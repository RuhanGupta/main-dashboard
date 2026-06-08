import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { BodyGoal } from '@/models/BodyGoal';
import {
  emptyListResponse,
  googleSyncErrorResponse,
  normalizeDateInput,
  removeClientManagedFields,
  requireCurrentUser,
} from '@/lib/api-helpers';
import { buildTaskNotes, createTask } from '@/lib/google-tasks';

type BodyGoalBody = {
  _id?: unknown;
  title: string;
  notes?: string | null;
  status?: string;
  dueDate?: Date | string | null;
  subtasks?: unknown[];
  googleTaskId?: string | null;
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function GET() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const goals = await BodyGoal.find({ userId: authResult.user.id }).sort({ createdAt: -1 });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const body = (await req.json()) as BodyGoalBody;
  removeClientManagedFields(body);
  body.dueDate = normalizeDateInput(body.dueDate);

  const goal = await BodyGoal.create({
    ...body,
    userId: authResult.user.id,
  });

  if (authResult.user.accessToken && goal.dueDate) {
    try {
      const id = await createTask(authResult.user.accessToken, {
        title: `💪 ${goal.title}`,
        notes: buildTaskNotes(goal.notes, `body-goal:${goal._id.toString()}`),
        dueDate: goal.dueDate,
        completed: goal.status === 'completed',
      });
      await BodyGoal.findOneAndUpdate(
        { _id: goal._id, userId: authResult.user.id },
        { googleTaskId: id }
      );
    } catch (error) {
      await BodyGoal.findOneAndDelete({ _id: goal._id, userId: authResult.user.id });
      return googleSyncErrorResponse(error);
    }
  }

  const saved = await BodyGoal.findOne({ _id: goal._id, userId: authResult.user.id });
  return NextResponse.json(saved, { status: 201 });
}
