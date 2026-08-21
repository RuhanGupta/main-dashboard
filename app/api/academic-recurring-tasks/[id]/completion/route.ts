import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { AcademicRecurringTask } from '@/models/AcademicRecurringTask';
import {
  readJsonBody,
  requireCurrentUser,
} from '@/lib/api-helpers';

type CompletionStatus = 'not_started' | 'in_progress' | 'completed';

type CompletionBody = {
  date?: string;
  status?: CompletionStatus;
  notes?: string;
};

type CompletionRecord = {
  date: string;
  status: CompletionStatus;
  completedAt?: Date;
  notes?: string;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const parsed_body = await readJsonBody<CompletionBody>(req);
  if (parsed_body.response) return parsed_body.response;
  const body = parsed_body.body;

  if (!body.date || !body.status) {
    return NextResponse.json({ error: 'date and status are required' }, { status: 400 });
  }

  const task = await AcademicRecurringTask.findOne({ _id: id, userId: authResult.user.id });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const log = task.completionLog as CompletionRecord[];
  const existing = log.find(r => r.date === body.date);
  const completedAt = body.status === 'completed' ? new Date() : undefined;

  if (existing) {
    existing.status = body.status;
    existing.completedAt = completedAt;
    if (body.notes !== undefined) existing.notes = body.notes;
  } else {
    log.push({ date: body.date, status: body.status, completedAt, notes: body.notes });
  }

  task.markModified('completionLog');
  await task.save();
  return NextResponse.json(task);
}
