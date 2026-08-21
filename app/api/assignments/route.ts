import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Assignment } from '@/models/Assignment';
import {
  emptyListResponse,
  normalizeDateInput,
  readJsonBody,
  removeClientManagedFields,
  requireCurrentUser,
} from '@/lib/api-helpers';

type AssignmentBody = {
  _id?: unknown;
  title: string;
  course: string;
  startDate?: Date | string | null;
  dueDate?: Date | string | null;
  priority?: string;
  status?: string;
  notes?: string | null;
  links?: unknown[];
  subtasks?: unknown[];
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function GET() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const assignments = await Assignment.find({ userId: authResult.user.id }).sort({ dueDate: 1 }).lean();
  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const parsed_body = await readJsonBody<AssignmentBody>(req);
  if (parsed_body.response) return parsed_body.response;
  const body = parsed_body.body;
  removeClientManagedFields(body);
  body.startDate = normalizeDateInput(body.startDate);
  body.dueDate = normalizeDateInput(body.dueDate);

  const doc = new Assignment();
  doc.set({ ...body, userId: authResult.user.id }, { strict: false });
  const assignment = await doc.save();

  const saved = await Assignment.findOne({ _id: assignment._id, userId: authResult.user.id }).lean();
  return NextResponse.json(saved, { status: 201 });
}
