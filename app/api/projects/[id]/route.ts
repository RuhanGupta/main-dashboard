import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
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
  startDate?: DateInput;
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
  startDate?: DateInput;
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
  startDate?: DateInput;
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

  const accessToken = authResult.user.accessToken;
  if (accessToken) {
    try {
      const projectDueDate = hasOwn(body, 'dueDate') ? body.dueDate : existing.dueDate;

      const parentPromise = (projectDueDate || existing.googleTaskId)
        ? upsertTask(accessToken, existing.googleTaskId, {
            title: `⭐ ${body.title ?? existing.title}`,
            notes: buildTaskNotes(body.notes ?? existing.notes, `project:${id}`),
            dueDate: projectDueDate,
            completed: (body.status ?? existing.status) === 'completed',
          })
        : Promise.resolve(null);

      const taskPromises = body.tasks
        ? body.tasks.map(async (task, ti) => {
            const prevTask = existingTasks.find(t => toIdString(t._id) === toIdString(task._id));
            const resolvedTaskId = prevTask?.googleTaskId ?? null;
            const beingCompleted = task.status === 'completed' && prevTask?.status !== 'completed';
            const shouldSyncTask = Boolean(task.dueDate || resolvedTaskId || beingCompleted);
            const prevSubs = prevTask?.subtasks ?? [];

            const [taskResult, ...subtaskResults] = await Promise.all([
              shouldSyncTask
                ? upsertTask(accessToken, resolvedTaskId, {
                    title: `⭐ ${task.title}`,
                    notes: buildTaskNotes(task.notes, `project:${id}:task:${toIdString(task._id) ?? task.title}`),
                    dueDate: task.dueDate,
                    completed: task.status === 'completed',
                  })
                : Promise.resolve(null),
              ...(Array.isArray(task.subtasks)
                ? task.subtasks.map(sub => {
                    const prev = prevSubs.find(s => toIdString(s._id) === toIdString(sub._id));
                    const resolvedSubId = prev?.googleTaskId ?? null;
                    const beingSubCompleted = sub.completed === true && prev?.completed !== true;
                    const shouldSyncSubtask = Boolean(sub.dueDate || resolvedSubId || beingSubCompleted);

                    if (!shouldSyncSubtask) return Promise.resolve(sub);

                    return upsertTask(accessToken, resolvedSubId, {
                      title: `⭐ ${task.title}: ${sub.title}`,
                      notes: buildTaskNotes(sub.notes, `project:${id}:task:${toIdString(task._id) ?? task.title}:subtask:${toIdString(sub._id) ?? sub.title}`),
                      dueDate: sub.dueDate,
                      completed: sub.completed ?? sub.status === 'completed',
                    }).then(result => ({ ...sub, googleTaskId: result.id }));
                  })
                : []),
            ]);

            const syncedTask = {
              ...task,
              googleTaskId: taskResult?.id ?? task.googleTaskId,
              subtasks: Array.isArray(task.subtasks) ? (subtaskResults as ProjectSubtaskBody[]) : task.subtasks,
            };

            if (Array.isArray(task.subtasks)) {
              const removedSubs = prevSubs.filter(
                s => !task.subtasks?.some(b => toIdString(b._id) === toIdString(s._id))
              );
              await Promise.all(
                removedSubs.filter(s => s.googleTaskId).map(s => deleteTask(accessToken, s.googleTaskId!))
              );
            }

            return { syncedTask, ti };
          })
        : [];

      const [parentResult, ...taskResults] = await Promise.all([parentPromise, ...taskPromises]);

      if (parentResult) body.googleTaskId = parentResult.id;
      if (body.tasks && taskResults.length > 0) {
        for (const { syncedTask, ti } of taskResults as { syncedTask: ProjectTaskBody; ti: number }[]) {
          body.tasks[ti] = syncedTask;
        }

        const removedTasks = existingTasks.filter(
          t => !body.tasks?.some(b => toIdString(b._id) === toIdString(t._id))
        );
        await Promise.all(
          removedTasks.flatMap(t => [
            ...(t.googleTaskId ? [deleteTask(accessToken, t.googleTaskId)] : []),
            ...(t.subtasks ?? []).filter(s => s.googleTaskId).map(s => deleteTask(accessToken, s.googleTaskId!)),
          ])
        );
      }
    } catch (error) {
      return googleSyncErrorResponse(error);
    }
  }

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
