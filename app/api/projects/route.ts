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
  startDate?: Date | string | null;
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
  const projects = await Project.find({ userId: authResult.user.id }).sort({ dueDate: 1 }).lean();
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const body = (await req.json()) as ProjectBody;
  removeClientManagedFields(body);
  body.startDate = normalizeDateInput(body.startDate);
  body.dueDate = normalizeDateInput(body.dueDate);

  const doc = new Project();
  doc.set({ ...body, userId: authResult.user.id }, { strict: false });
  const project = await doc.save();

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
      // Log but don't delete — user can sync later via the sync button
      console.error('[google-tasks] Failed to create task for new project:', error);
    }
  }

  const saved = await Project.findOne({ _id: project._id, userId: authResult.user.id }).lean();
  return NextResponse.json(saved, { status: 201 });
}
