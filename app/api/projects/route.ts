import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Project } from '@/models/Project';
import {
  emptyListResponse,
  normalizeDateInput,
  readJsonBody,
  removeClientManagedFields,
  requireCurrentUser,
} from '@/lib/api-helpers';

type ProjectBody = {
  _id?: unknown;
  title: string;
  description?: string;
  startDate?: Date | string | null;
  dueDate?: Date | string | null;
  priority?: string;
  status?: string;
  notes?: string | null;
  links?: unknown[];
  tasks?: unknown[];
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function GET() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const projects = await Project.find({ userId: authResult.user.id }).sort({ dueDate: 1 }).lean();
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const parsed_body = await readJsonBody<ProjectBody>(req);
  if (parsed_body.response) return parsed_body.response;
  const body = parsed_body.body;
  removeClientManagedFields(body);
  body.startDate = normalizeDateInput(body.startDate);
  body.dueDate = normalizeDateInput(body.dueDate);

  const doc = new Project();
  doc.set({ ...body, userId: authResult.user.id }, { strict: false });
  const project = await doc.save();

  return NextResponse.json(project, { status: 201 });
}
