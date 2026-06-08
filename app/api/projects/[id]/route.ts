import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Project } from '@/models/Project';
import {
  googleSyncErrorResponse,
  hasOwn,
  normalizeDateInput,
  removeClientManagedFields,
  requireCurrentUser,
  toIdString,
} from '@/lib/api-helpers';
import { buildTaskNotes, upsertTask, deleteTask } from '@/lib/google-tasks';

type DateInput = Date | string | null | undefined;
type IdLike = string | { toString(): string };

type ProjectSubtaskBody = {
  _id?: IdLike;
  title: string;
  description?: string;
  dueDate?: DateInput;
  priority?: string;
  status?: string;
  notes?: string | null;
  googleTaskId?: string | null;
  completed?: boolean;
};

type ProjectTaskBody = {
  _id?: IdLike;
  title: string;
  description?: string;
  dueDate?: DateInput;
  priority?: string;
  status?: string;
  notes?: string | null;
  googleTaskId?: string | null;
  subtasks?: ProjectSubtaskBody[];
};

type ProjectBody = {
  _id?: unknown;
  title?: string;
  description?: string;
  dueDate?: DateInput;
  priority?: string;
  status?: string;
  notes?: string | null;
  links?: unknown[];
  tasks?: ProjectTaskBody[];
  googleTaskId?: string | null;
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
  googleTaskId?: string | null;
  tasks: ProjectTaskBody[];
};

function normalizeSubtask(subtask: ProjectSubtaskBody): ProjectSubtaskBody {
  return {
    ...subtask,
    dueDate: normalizeDateInput(subtask.dueDate),
  };
}

function normalizeTask(task: ProjectTaskBody): ProjectTaskBody {
  return {
    ...task,
    dueDate: normalizeDateInput(task.dueDate),
    subtasks: Array.isArray(task.subtasks) ? task.subtasks.map(normalizeSubtask) : task.subtasks,
  };
}

function normalizeProjectBody(body: ProjectBody): ProjectBody {
  return {
    ...body,
    dueDate: normalizeDateInput(body.dueDate),
    tasks: Array.isArray(body.tasks) ? body.tasks.map(normalizeTask) : body.tasks,
  };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const project = await Project.findOne({ _id: id, userId: authResult.user.id });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const body = normalizeProjectBody((await req.json()) as ProjectBody);
  removeClientManagedFields(body);
  body.userId = authResult.user.id;

  const existing = (await Project.findOne({ _id: id, userId: authResult.user.id }).lean()) as ProjectRecord | null;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const existingTasks = existing.tasks ?? [];
  if (body.tasks) {
    body.tasks = body.tasks.map(task => {
      const prevTask = existingTasks.find(t => toIdString(t._id) === toIdString(task._id));
      const sanitizedSubtasks = task.subtasks?.map(sub => {
        const prevSub = prevTask?.subtasks?.find(s => toIdString(s._id) === toIdString(sub._id));
        return prevSub?.googleTaskId ? { ...sub, googleTaskId: prevSub.googleTaskId } : { ...sub, googleTaskId: null };
      });

      return {
        ...task,
        googleTaskId: prevTask?.googleTaskId ?? null,
        subtasks: sanitizedSubtasks ?? task.subtasks,
      };
    });
  }

  if (authResult.user.accessToken) {
    try {
      const projectDueDate = hasOwn(body, 'dueDate') ? body.dueDate : existing.dueDate;

      if (projectDueDate || existing.googleTaskId) {
        const result = await upsertTask(authResult.user.accessToken, existing.googleTaskId, {
          title: `⭐ ${body.title ?? existing.title}`,
          notes: buildTaskNotes(body.notes ?? existing.notes, `project:${id}`),
          dueDate: projectDueDate,
          completed: (body.status ?? existing.status) === 'completed',
        });
        body.googleTaskId = result.id;
      }

      if (body.tasks) {
        for (let ti = 0; ti < body.tasks.length; ti++) {
          const task = body.tasks[ti];
          const prevTask = existingTasks.find(t => toIdString(t._id) === toIdString(task._id));
          const resolvedTaskId = prevTask?.googleTaskId ?? null;
          const beingCompleted = task.status === 'completed' && prevTask?.status !== 'completed';
          const shouldSyncTask = Boolean(task.dueDate || resolvedTaskId || beingCompleted);

          if (shouldSyncTask) {
            const result = await upsertTask(authResult.user.accessToken, resolvedTaskId, {
              title: `⭐ ${task.title}`,
              notes: buildTaskNotes(task.notes, `project:${id}:task:${toIdString(task._id) ?? task.title}`),
              dueDate: task.dueDate,
              completed: task.status === 'completed',
            });
            body.tasks[ti] = { ...task, googleTaskId: result.id };
          }

          if (Array.isArray(task.subtasks)) {
            const prevSubs = prevTask?.subtasks ?? [];

            for (let si = 0; si < task.subtasks.length; si++) {
              const sub = task.subtasks[si];
              const prev = prevSubs.find(s => toIdString(s._id) === toIdString(sub._id));
              const resolvedSubId = prev?.googleTaskId ?? null;
              const beingSubCompleted = sub.completed === true && prev?.completed !== true;
              const shouldSyncSubtask = Boolean(sub.dueDate || resolvedSubId || beingSubCompleted);

              if (!shouldSyncSubtask) continue;

              const result = await upsertTask(authResult.user.accessToken, resolvedSubId, {
                title: `⭐ ${task.title}: ${sub.title}`,
                notes: buildTaskNotes(sub.notes, `project:${id}:task:${toIdString(task._id) ?? task.title}:subtask:${toIdString(sub._id) ?? sub.title}`),
                dueDate: sub.dueDate,
                completed: sub.completed ?? sub.status === 'completed',
              });
              task.subtasks[si] = { ...sub, googleTaskId: result.id };
            }

            const removedSubs = prevSubs.filter(
              s => !task.subtasks?.some(b => toIdString(b._id) === toIdString(s._id))
            );
            for (const s of removedSubs) {
              if (s.googleTaskId) await deleteTask(authResult.user.accessToken, s.googleTaskId);
            }
          }
        }

        const removedTasks = existingTasks.filter(
          t => !body.tasks?.some(b => toIdString(b._id) === toIdString(t._id))
        );
        for (const t of removedTasks) {
          if (t.googleTaskId) await deleteTask(authResult.user.accessToken, t.googleTaskId);
          for (const s of t.subtasks ?? []) {
            if (s.googleTaskId) await deleteTask(authResult.user.accessToken, s.googleTaskId);
          }
        }
      }
    } catch (error) {
      return googleSyncErrorResponse(error);
    }
  }

  const updated = await Project.findOneAndUpdate(
    { _id: id, userId: authResult.user.id },
    body,
    { new: true }
  );
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const existing = (await Project.findOne({ _id: id, userId: authResult.user.id }).lean()) as ProjectRecord | null;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (authResult.user.accessToken) {
    try {
      if (existing.googleTaskId) await deleteTask(authResult.user.accessToken, existing.googleTaskId);
      for (const t of existing.tasks ?? []) {
        if (t.googleTaskId) await deleteTask(authResult.user.accessToken, t.googleTaskId);
        for (const s of t.subtasks ?? []) {
          if (s.googleTaskId) await deleteTask(authResult.user.accessToken, s.googleTaskId);
        }
      }
    } catch (error) {
      return googleSyncErrorResponse(error);
    }
  }

  await Project.findOneAndDelete({ _id: id, userId: authResult.user.id });
  return NextResponse.json({ success: true });
}
