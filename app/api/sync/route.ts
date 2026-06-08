import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Assignment } from '@/models/Assignment';
import { Project } from '@/models/Project';
import { BodyGoal } from '@/models/BodyGoal';
import { getErrorMessage, googleSyncErrorResponse, requireCurrentUser, toIdString } from '@/lib/api-helpers';
import {
  buildTaskNotes,
  deleteTask,
  isStudentDashboardTask,
  listAllTasks,
  upsertTask,
  type GoogleTaskItem,
} from '@/lib/google-tasks';

type DateInput = Date | string | null | undefined;
type IdLike = string | { toString(): string };

type SubtaskRecord = {
  _id?: IdLike;
  title: string;
  dueDate?: DateInput;
  notes?: string | null;
  status?: string;
  completed?: boolean;
  googleTaskId?: string | null;
};

type AssignmentRecord = {
  _id: IdLike;
  title: string;
  course: string;
  dueDate?: DateInput;
  notes?: string | null;
  status?: string;
  googleTaskId?: string | null;
  subtasks: SubtaskRecord[];
};

type ProjectTaskRecord = {
  _id?: IdLike;
  title: string;
  dueDate?: DateInput;
  notes?: string | null;
  status?: string;
  googleTaskId?: string | null;
  subtasks?: SubtaskRecord[];
};

type ProjectRecord = {
  _id: IdLike;
  title: string;
  dueDate?: DateInput;
  notes?: string | null;
  status?: string;
  googleTaskId?: string | null;
  tasks: ProjectTaskRecord[];
};

type BodyGoalRecord = {
  _id: IdLike;
  title: string;
  dueDate?: DateInput;
  notes?: string | null;
  status?: string;
  googleTaskId?: string | null;
};

type SyncStats = {
  created: number;
  updated: number;
  deleted: number;
  errors: number;
};

export async function POST() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;
  if (!authResult.user.accessToken) {
    return NextResponse.json({ error: 'Google access token unavailable' }, { status: 401 });
  }

  const token = authResult.user.accessToken;
  const userId = authResult.user.id;

  await connectToDatabase();

  const stats: SyncStats = { created: 0, updated: 0, deleted: 0, errors: 0 };

  let existingGoogleTasks: Awaited<ReturnType<typeof listAllTasks>>;
  try {
    existingGoogleTasks = await listAllTasks(token);
  } catch (error) {
    return googleSyncErrorResponse(error);
  }

  const usedTaskIds = new Set<string>();

  async function sync(
    googleTaskId: string | undefined | null,
    item: GoogleTaskItem,
    saveId: (id: string) => Promise<void>
  ) {
    try {
      const result = await upsertTask(token, googleTaskId, item);
      usedTaskIds.add(result.id);

      if (result.id !== googleTaskId) {
        await saveId(result.id);
      }

      if (result.action === 'updated') {
        stats.updated++;
      } else {
        stats.created++;
      }
      return result.id;
    } catch (error) {
      console.error('[sync] Google Task upsert failed:', getErrorMessage(error));
      stats.errors++;
      return null;
    }
  }

  const assignments = (await Assignment.find({ userId }).lean()) as AssignmentRecord[];
  for (const a of assignments) {
    const assignmentId = toIdString(a._id);

    if (a.dueDate || a.googleTaskId) {
      await sync(
        a.googleTaskId,
        {
          title: `📚 ${a.title} — ${a.course}`,
          notes: buildTaskNotes(a.notes, `assignment:${assignmentId}`),
          dueDate: a.dueDate,
          completed: a.status === 'completed',
        },
        id => Assignment.findOneAndUpdate({ _id: a._id, userId }, { googleTaskId: id }).then(() => {})
      );
    }

    let subtasksChanged = false;
    const updatedSubs = [...(a.subtasks ?? [])];
    for (let i = 0; i < updatedSubs.length; i++) {
      const s = updatedSubs[i];
      if (s.googleTaskId) usedTaskIds.add(s.googleTaskId);

      if (!s.dueDate && !s.googleTaskId) continue;

      const subId = await sync(
        s.googleTaskId,
        {
          title: `📚 ${s.title}`,
          notes: buildTaskNotes(s.notes, `assignment:${assignmentId}:subtask:${toIdString(s._id) ?? s.title}`),
          dueDate: s.dueDate,
          completed: s.completed ?? s.status === 'completed',
        },
        async id => {
          updatedSubs[i] = { ...s, googleTaskId: id };
          subtasksChanged = true;
        }
      );

      if (subId) {
        usedTaskIds.add(subId);
      }
    }
    if (subtasksChanged) {
      await Assignment.findOneAndUpdate({ _id: a._id, userId }, { subtasks: updatedSubs });
    }
  }

  const projects = (await Project.find({ userId }).lean()) as ProjectRecord[];
  for (const p of projects) {
    const projectId = toIdString(p._id);

    if (p.dueDate || p.googleTaskId) {
      await sync(
        p.googleTaskId,
        {
          title: `⭐ ${p.title}`,
          notes: buildTaskNotes(p.notes, `project:${projectId}`),
          dueDate: p.dueDate,
          completed: p.status === 'completed',
        },
        id => Project.findOneAndUpdate({ _id: p._id, userId }, { googleTaskId: id }).then(() => {})
      );
    }

    let tasksChanged = false;
    const updatedTasks = [...(p.tasks ?? [])];
    for (let ti = 0; ti < updatedTasks.length; ti++) {
      const t = updatedTasks[ti];
      if (t.googleTaskId) usedTaskIds.add(t.googleTaskId);

      if (t.dueDate || t.googleTaskId) {
        const taskId = await sync(
          t.googleTaskId,
          {
            title: `⭐ ${t.title}`,
            notes: buildTaskNotes(t.notes, `project:${projectId}:task:${toIdString(t._id) ?? t.title}`),
            dueDate: t.dueDate,
            completed: t.status === 'completed',
          },
          async id => {
            updatedTasks[ti] = { ...t, googleTaskId: id };
            tasksChanged = true;
          }
        );

        if (taskId) usedTaskIds.add(taskId);
      }

      const updatedSubtasks = [...(updatedTasks[ti].subtasks ?? [])];
      let subtasksChanged = false;
      for (let si = 0; si < updatedSubtasks.length; si++) {
        const s = updatedSubtasks[si];
        if (s.googleTaskId) usedTaskIds.add(s.googleTaskId);
        if (!s.dueDate && !s.googleTaskId) continue;

        const subId = await sync(
          s.googleTaskId,
          {
            title: `⭐ ${t.title}: ${s.title}`,
            notes: buildTaskNotes(s.notes, `project:${projectId}:task:${toIdString(t._id) ?? t.title}:subtask:${toIdString(s._id) ?? s.title}`),
            dueDate: s.dueDate,
            completed: s.completed ?? s.status === 'completed',
          },
          async id => {
            updatedSubtasks[si] = { ...s, googleTaskId: id };
            subtasksChanged = true;
          }
        );

        if (subId) usedTaskIds.add(subId);
      }
      if (subtasksChanged) {
        updatedTasks[ti] = { ...updatedTasks[ti], subtasks: updatedSubtasks };
        tasksChanged = true;
      }
    }
    if (tasksChanged) {
      await Project.findOneAndUpdate({ _id: p._id, userId }, { tasks: updatedTasks });
    }
  }

  const goals = (await BodyGoal.find({ userId }).lean()) as BodyGoalRecord[];
  for (const g of goals) {
    if (!g.dueDate && !g.googleTaskId) continue;

    const goalId = toIdString(g._id);
    await sync(
      g.googleTaskId,
      {
        title: `💪 ${g.title}`,
        notes: buildTaskNotes(g.notes, `body-goal:${goalId}`),
        dueDate: g.dueDate,
        completed: g.status === 'completed',
      },
      id => BodyGoal.findOneAndUpdate({ _id: g._id, userId }, { googleTaskId: id }).then(() => {})
    );
  }

  for (const gt of existingGoogleTasks) {
    if (gt.id && isStudentDashboardTask(gt) && !usedTaskIds.has(gt.id)) {
      try {
        await deleteTask(token, gt.id);
        stats.deleted++;
      } catch (error) {
        console.error('[sync] Google Task delete failed:', getErrorMessage(error));
        stats.errors++;
      }
    }
  }

  return NextResponse.json(
    { ok: stats.errors === 0, stats },
    { status: stats.errors === 0 ? 200 : 207 }
  );
}
