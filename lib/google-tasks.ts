import { google } from 'googleapis';
import type { tasks_v1 } from 'googleapis';

const TASKLIST = '@default';
const DASHBOARD_MARKER = '[student-dashboard-task]';
const DASHBOARD_PREFIXES = ['📚 ', '⭐ ', '💪 '];

export type GoogleTaskDate = Date | string | null | undefined;

export type GoogleTaskItem = {
  title: string;
  notes?: string | null;
  dueDate?: GoogleTaskDate;
  completed?: boolean;
};

export type UpsertTaskResult = {
  id: string;
  action: 'created' | 'updated' | 'recreated';
};

function getClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.tasks({ version: 'v1', auth });
}

function getGoogleErrorCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'number' ? code : undefined;
}

function toDueDate(date: GoogleTaskDate): string | null | undefined {
  if (date === undefined) return undefined;
  if (date === null || date === '') return null;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Google Task due date: ${String(date)}`);
  }

  // Google Tasks requires RFC 3339 midnight UTC for all-day tasks
  return parsed.toISOString().split('T')[0] + 'T00:00:00.000Z';
}

export function buildTaskNotes(notes: string | null | undefined, sourceId: string): string {
  const cleanNotes = notes?.trim();
  const marker = `${DASHBOARD_MARKER} ${sourceId}`;
  return cleanNotes ? `${cleanNotes}\n\n${marker}` : marker;
}

export function isStudentDashboardTask(task: tasks_v1.Schema$Task): boolean {
  const title = task.title ?? '';
  const notes = task.notes ?? '';
  return notes.includes(DASHBOARD_MARKER) || DASHBOARD_PREFIXES.some(prefix => title.startsWith(prefix));
}

function toRequestBody(item: GoogleTaskItem, includeClears: boolean): tasks_v1.Schema$Task {
  const completed = item.completed === true;
  const due = toDueDate(item.dueDate);
  const body: tasks_v1.Schema$Task = {
    title: item.title,
    notes: item.notes ?? '',
    status: completed ? 'completed' : 'needsAction',
  };

  if (due !== undefined && (due !== null || includeClears)) {
    body.due = due;
  }

  if (completed) {
    body.completed = new Date().toISOString();
  } else if (includeClears) {
    body.completed = null;
  }

  return body;
}

export async function createTask(
  accessToken: string,
  item: GoogleTaskItem
): Promise<string> {
  const client = getClient(accessToken);
  const res = await client.tasks.insert({
    tasklist: TASKLIST,
    requestBody: toRequestBody(item, false),
  });

  if (!res.data.id) {
    throw new Error('Google Tasks did not return an id for the created task.');
  }

  return res.data.id;
}

export async function updateTask(
  accessToken: string,
  taskId: string,
  item: GoogleTaskItem
): Promise<boolean> {
  try {
    const client = getClient(accessToken);
    await client.tasks.patch({
      tasklist: TASKLIST,
      task: taskId,
      requestBody: toRequestBody(item, true),
    });
    return true;
  } catch (err) {
    if (getGoogleErrorCode(err) === 404) return false;
    throw err;
  }
}

export async function deleteTask(accessToken: string, taskId: string): Promise<void> {
  try {
    const client = getClient(accessToken);
    await client.tasks.delete({ tasklist: TASKLIST, task: taskId });
  } catch (err) {
    if (getGoogleErrorCode(err) !== 404) throw err;
  }
}

export async function listAllTasks(accessToken: string): Promise<tasks_v1.Schema$Task[]> {
  const client = getClient(accessToken);
  const items: tasks_v1.Schema$Task[] = [];
  let pageToken: string | undefined;

  do {
    const res = await client.tasks.list({
      tasklist: TASKLIST,
      maxResults: 100,
      showCompleted: true,
      showHidden: false,
      pageToken,
    });

    items.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return items;
}

export async function upsertTask(
  accessToken: string,
  taskId: string | undefined | null,
  item: GoogleTaskItem
): Promise<UpsertTaskResult> {
  if (taskId) {
    const ok = await updateTask(accessToken, taskId, item);
    if (ok) return { id: taskId, action: 'updated' };

    const recreatedId = await createTask(accessToken, item);
    return { id: recreatedId, action: 'recreated' };
  }

  const id = await createTask(accessToken, item);
  return { id, action: 'created' };
}
