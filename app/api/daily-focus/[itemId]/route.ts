import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DailyFocus } from '@/models/DailyFocus';
import { Assignment } from '@/models/Assignment';
import { Project } from '@/models/Project';
import { BodyGoal } from '@/models/BodyGoal';
import {
  readJsonBody,
  requireCurrentUser,
} from '@/lib/api-helpers';
import type { DailyFocusSourceType } from '@/types';

type DailyFocusItemRecord = {
  sourceType: DailyFocusSourceType;
  sourceId: string;
  parentId: string;
};

// PATCH — update completed and/or startDate/dueDate; propagates to the source document
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { itemId } = await params;
  const parsed = await readJsonBody<{
    completed?: boolean;
    startDate?: string | null;
    dueDate?: string | null;
  }>(req);
  if (parsed.response) return parsed.response;
  const body = parsed.body;

  // Build update for the focus item itself
  const focusSet: Record<string, unknown> = {};
  if (body.completed !== undefined) focusSet['items.$.completed'] = body.completed;
  if ('startDate' in body) focusSet['items.$.startDate'] = body.startDate ? new Date(body.startDate) : null;
  if ('dueDate' in body) focusSet['items.$.dueDate'] = body.dueDate ? new Date(body.dueDate) : null;

  const doc = await DailyFocus.findOne(
    { userId: authResult.user.id, 'items._id': itemId },
    { 'items.$': 1 }
  ).lean() as { items?: DailyFocusItemRecord[] } | null;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const item = doc.items?.[0];
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (Object.keys(focusSet).length) {
    await DailyFocus.updateOne(
      { userId: authResult.user.id, 'items._id': itemId },
      { $set: focusSet }
    );
  }

  // Propagate to source document
  try {
    if (item.sourceType === 'assignment_subtask') {
      const sourceSet: Record<string, unknown> = {};
      if (body.completed !== undefined) {
        sourceSet['subtasks.$.completed'] = body.completed;
        sourceSet['subtasks.$.status'] = body.completed ? 'completed' : 'not_started';
      }
      if ('startDate' in body) sourceSet['subtasks.$.startDate'] = body.startDate ? new Date(body.startDate) : null;
      if ('dueDate' in body) sourceSet['subtasks.$.dueDate'] = body.dueDate ? new Date(body.dueDate) : null;
      if (Object.keys(sourceSet).length) {
        await Assignment.updateOne(
          { _id: item.parentId, userId: authResult.user.id, 'subtasks._id': item.sourceId },
          { $set: sourceSet }
        );
      }
    } else if (item.sourceType === 'project_task') {
      const sourceSet: Record<string, unknown> = {};
      if (body.completed !== undefined) sourceSet['tasks.$.status'] = body.completed ? 'completed' : 'not_started';
      if ('startDate' in body) sourceSet['tasks.$.startDate'] = body.startDate ? new Date(body.startDate) : null;
      if ('dueDate' in body) sourceSet['tasks.$.dueDate'] = body.dueDate ? new Date(body.dueDate) : null;
      if (Object.keys(sourceSet).length) {
        await Project.updateOne(
          { _id: item.parentId, userId: authResult.user.id, 'tasks._id': item.sourceId },
          { $set: sourceSet }
        );
      }
    } else if (item.sourceType === 'body_goal_subtask') {
      const sourceSet: Record<string, unknown> = {};
      if (body.completed !== undefined) sourceSet['subtasks.$.completed'] = body.completed;
      if ('dueDate' in body) sourceSet['subtasks.$.dueDate'] = body.dueDate ? new Date(body.dueDate) : null;
      if (Object.keys(sourceSet).length) {
        await BodyGoal.updateOne(
          { _id: item.parentId, userId: authResult.user.id, 'subtasks._id': item.sourceId },
          { $set: sourceSet }
        );
      }
    }
  } catch {
    // Source update is best-effort — don't fail the whole request
  }

  return NextResponse.json({ ok: true });
}

// DELETE — remove item from the focus list (does NOT undo completion in source)
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { itemId } = await params;

  await DailyFocus.updateOne(
    { userId: authResult.user.id },
    { $pull: { items: { _id: itemId } } }
  );

  return NextResponse.json({ ok: true });
}
