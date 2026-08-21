import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { BodyGoal } from '@/models/BodyGoal';
import {
  emptyListResponse,
  normalizeDateInput,
  readJsonBody,
  removeClientManagedFields,
  requireCurrentUser,
} from '@/lib/api-helpers';

type BodyGoalBody = {
  _id?: unknown;
  title: string;
  notes?: string | null;
  status?: string;
  dueDate?: Date | string | null;
  subtasks?: unknown[];
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function GET() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const goals = await BodyGoal.find({ userId: authResult.user.id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const parsed_body = await readJsonBody<BodyGoalBody>(req);
  if (parsed_body.response) return parsed_body.response;
  const body = parsed_body.body;
  removeClientManagedFields(body);
  body.dueDate = normalizeDateInput(body.dueDate);

  const goal = await BodyGoal.create({
    ...body,
    userId: authResult.user.id,
  });

  return NextResponse.json(goal, { status: 201 });
}
