import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Assignment } from '@/models/Assignment';
import {
  emptyListResponse,
  googleSyncErrorResponse,
  normalizeDateInput,
  removeClientManagedFields,
  requireCurrentUser,
} from '@/lib/api-helpers';
import { buildTaskNotes, createTask } from '@/lib/google-tasks';

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
  googleTaskId?: string | null;
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
  const body = (await req.json()) as AssignmentBody;
  removeClientManagedFields(body);
  body.startDate = normalizeDateInput(body.startDate);
  body.dueDate = normalizeDateInput(body.dueDate);

  const doc = new Assignment();
  doc.set({ ...body, userId: authResult.user.id }, { strict: false });
  const assignment = await doc.save();

  // Google Tasks sync is best-effort — never delete the DB record if it fails
  if (authResult.user.accessToken && assignment.dueDate) {
    try {
      const id = await createTask(authResult.user.accessToken, {
        title: `📚 ${assignment.title} — ${assignment.course}`,
        notes: buildTaskNotes(assignment.notes, `assignment:${assignment._id.toString()}`),
        dueDate: assignment.dueDate,
        completed: assignment.status === 'completed',
      });
      await Assignment.findOneAndUpdate(
        { _id: assignment._id, userId: authResult.user.id },
        { googleTaskId: id }
      );
    } catch (error) {
      // Log but don't delete — user can sync later via the sync button
      console.error('[google-tasks] Failed to create task for new assignment:', error);
    }
  }

  const saved = await Assignment.findOne({ _id: assignment._id, userId: authResult.user.id }).lean();
  return NextResponse.json(saved, { status: 201 });
}
