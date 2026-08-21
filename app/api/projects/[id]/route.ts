import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Project } from '@/models/Project';
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

type ProjectSubtaskBody = {
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

type ProjectTaskBody = {
  _id?: IdLike;
  title: string;
  description?: string;
  startDate?: DateInput;
  dueDate?: DateInput;
  priority?: string;
  status?: string;
  notes?: string | null;
  subtasks?: ProjectSubtaskBody[];
};

type ProjectBody = {
  _id?: unknown;
  title?: string;
  description?: string;
  startDate?: DateInput;
  dueDate?: DateInput;
  priority?: string;
  status?: string;
  notes?: string | null;
  links?: unknown[];
  tasks?: ProjectTaskBody[];
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type ProjectRecord = Required<Pick<ProjectBody, 'title'>> & {
  _id: IdLike;
  userId: string;
  dueDate?: DateInput;
  status?: string;
  notes?: string | null;
  tasks: ProjectTaskBody[];
};

function normalizeSubtask(subtask: ProjectSubtaskBody): ProjectSubtaskBody {
  return {
    ...subtask,
    startDate: normalizeDateInput(subtask.startDate),
    dueDate: normalizeDateInput(subtask.dueDate),
  };
}

function normalizeTask(task: ProjectTaskBody): ProjectTaskBody {
  return {
    ...task,
    startDate: normalizeDateInput(task.startDate),
    dueDate: normalizeDateInput(task.dueDate),
    subtasks: Array.isArray(task.subtasks) ? task.subtasks.map(normalizeSubtask) : task.subtasks,
  };
}

function normalizeProjectBody(body: ProjectBody): ProjectBody {
  return {
    ...body,
    startDate: normalizeDateInput(body.startDate),
    dueDate: normalizeDateInput(body.dueDate),
    tasks: Array.isArray(body.tasks) ? body.tasks.map(normalizeTask) : body.tasks,
  };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const project = await Project.findOne({ _id: id, userId: authResult.user.id }).lean();
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const parsed = await readJsonBody<ProjectBody>(req);
  if (parsed.response) return parsed.response;
  const body = normalizeProjectBody(parsed.body);
  removeClientManagedFields(body);
  body.userId = authResult.user.id;

  const existing = (await Project.findOne({ _id: id, userId: authResult.user.id }).lean()) as ProjectRecord | null;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await Project.collection.updateOne(
    { _id: new Types.ObjectId(id), userId: authResult.user.id },
    { $set: body }
  );
  const updated = await Project.findOne({ _id: id, userId: authResult.user.id }).lean();
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const existing = (await Project.findOne({ _id: id, userId: authResult.user.id }).lean()) as ProjectRecord | null;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await Project.findOneAndDelete({ _id: id, userId: authResult.user.id });
  return NextResponse.json({ success: true });
}
