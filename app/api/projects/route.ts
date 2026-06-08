import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Project } from '@/models/Project';
import {
  emptyListResponse,
  googleSyncErrorResponse,
  normalizeDateInput,
  removeClientManagedFields,
  requireCurrentUser,
} from '@/lib/api-helpers';
import { buildTaskNotes, createTask } from '@/lib/google-tasks';

type ProjectBody = {
  _id?: unknown;
  title: string;
  description?: string;
  dueDate?: Date | string | null;
  priority?: string;
  status?: string;
  notes?: string | null;
  links?: unknown[];
  tasks?: unknown[];
  googleTaskId?: string | null;
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function GET() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const projects = await Project.find({ userId: authResult.user.id }).sort({ dueDate: 1 });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const body = (await req.json()) as ProjectBody;
  removeClientManagedFields(body);
  body.dueDate = normalizeDateInput(body.dueDate);

  const project = await Project.create({
    ...body,
    userId: authResult.user.id,
  });

  if (authResult.user.accessToken && project.dueDate) {
    try {
      const id = await createTask(authResult.user.accessToken, {
        title: `⭐ ${project.title}`,
        notes: buildTaskNotes(project.notes, `project:${project._id.toString()}`),
        dueDate: project.dueDate,
        completed: project.status === 'completed',
      });
      await Project.findOneAndUpdate(
        { _id: project._id, userId: authResult.user.id },
        { googleTaskId: id }
      );
    } catch (error) {
      await Project.findOneAndDelete({ _id: project._id, userId: authResult.user.id });
      return googleSyncErrorResponse(error);
    }
  }

  const saved = await Project.findOne({ _id: project._id, userId: authResult.user.id });
  return NextResponse.json(saved, { status: 201 });
}
