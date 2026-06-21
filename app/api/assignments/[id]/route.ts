import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Assignment } from '@/models/Assignment';
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

type AssignmentSubtaskBody = {
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

type AssignmentBody = {
  _id?: unknown;
  title?: string;
  course?: string;
  startDate?: DateInput;
  dueDate?: DateInput;
  priority?: string;
  status?: string;
  notes?: string | null;
  links?: unknown[];
  subtasks?: AssignmentSubtaskBody[];
  googleTaskId?: string | null;
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type AssignmentRecord = Required<Pick<AssignmentBody, 'title' | 'course'>> & {
  _id: IdLike;
  userId: string;
  dueDate?: DateInput;
  status?: string;
  notes?: string | null;
  googleTaskId?: string | null;
  subtasks: AssignmentSubtaskBody[];
};

function normalizeSubtask(subtask: AssignmentSubtaskBody): AssignmentSubtaskBody {
  return {
    ...subtask,
    startDate: normalizeDateInput(subtask.startDate),
    dueDate: normalizeDateInput(subtask.dueDate),
  };
}

function normalizeAssignmentBody(body: AssignmentBody): AssignmentBody {
  return {
    ...body,
    startDate: normalizeDateInput(body.startDate),
    dueDate: normalizeDateInput(body.dueDate),
    subtasks: Array.isArray(body.subtasks) ? body.subtasks.map(normalizeSubtask) : body.subtasks,
  };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const assignment = await Assignment.findOne({ _id: id, userId: authResult.user.id });
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(assignment);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const body = normalizeAssignmentBody((await req.json()) as AssignmentBody);
  removeClientManagedFields(body);
  body.userId = authResult.user.id;

  const existing = (await Assignment.findOne({ _id: id, userId: authResult.user.id }).lean()) as AssignmentRecord | null;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const nowCompleted = (body.status ?? existing.status) === 'completed';
  const justCompleted = body.status === 'completed' && existing.status !== 'completed';

  if (justCompleted) {
    const subs = body.subtasks ?? existing.subtasks;
    body.subtasks = subs.map(s => ({ ...s, completed: true }));
  }

  const existingSubs = existing.subtasks ?? [];
  if (body.subtasks) {
    body.subtasks = body.subtasks.map(sub => {
      const prev = existingSubs.find(s => toIdString(s._id) === toIdString(sub._id));
      return prev?.googleTaskId ? { ...sub, googleTaskId: prev.googleTaskId } : { ...sub, googleTaskId: null };
    });
  }

  const accessToken = authResult.user.accessToken;
  if (accessToken) {
    try {
      const assignmentDueDate = hasOwn(body, 'dueDate') ? body.dueDate : existing.dueDate;
      const subtasksToSync = body.subtasks ?? [];

      const parentPromise = (assignmentDueDate || existing.googleTaskId)
        ? upsertTask(accessToken, existing.googleTaskId, {
            title: `📚 ${body.title ?? existing.title} — ${body.course ?? existing.course}`,
            notes: buildTaskNotes(body.notes ?? existing.notes, `assignment:${id}`),
            dueDate: assignmentDueDate,
            completed: nowCompleted,
          })
        : Promise.resolve(null);

      const subtaskPromises = body.subtasks
        ? subtasksToSync.map(sub => {
            const prev = existingSubs.find(s => toIdString(s._id) === toIdString(sub._id));
            const resolvedTaskId = prev?.googleTaskId ?? null;
            const beingCompleted = sub.completed === true && prev?.completed !== true;
            const shouldSync = Boolean(sub.dueDate || resolvedTaskId || beingCompleted || justCompleted);

            if (!shouldSync) return Promise.resolve(sub);

            return upsertTask(accessToken, resolvedTaskId, {
              title: `📚 ${sub.title}`,
              notes: buildTaskNotes(sub.notes, `assignment:${id}:subtask:${toIdString(sub._id) ?? sub.title}`),
              dueDate: sub.dueDate,
              completed: (sub.completed ?? sub.status === 'completed') || justCompleted,
            }).then(result => ({ ...sub, googleTaskId: result.id }));
          })
        : [];

      const [parentResult, ...syncedSubtasks] = await Promise.all([parentPromise, ...subtaskPromises]);

      if (parentResult) body.googleTaskId = parentResult.id;
      if (body.subtasks) {
        body.subtasks = syncedSubtasks as AssignmentSubtaskBody[];

        const removedSubs = existingSubs.filter(
          s => !subtasksToSync.some(b => toIdString(b._id) === toIdString(s._id))
        );
        await Promise.all(
          removedSubs.filter(s => s.googleTaskId).map(s => deleteTask(accessToken, s.googleTaskId!))
        );
      }
    } catch (error) {
      return googleSyncErrorResponse(error);
    }
  }

  const updated = await Assignment.findOneAndUpdate(
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
  const existing = (await Assignment.findOne({ _id: id, userId: authResult.user.id }).lean()) as AssignmentRecord | null;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (authResult.user.accessToken) {
    try {
      if (existing.googleTaskId) await deleteTask(authResult.user.accessToken, existing.googleTaskId);
      for (const s of existing.subtasks ?? []) {
        if (s.googleTaskId) await deleteTask(authResult.user.accessToken, s.googleTaskId);
      }
    } catch (error) {
      return googleSyncErrorResponse(error);
    }
  }

  await Assignment.findOneAndDelete({ _id: id, userId: authResult.user.id });
  return NextResponse.json({ success: true });
}
