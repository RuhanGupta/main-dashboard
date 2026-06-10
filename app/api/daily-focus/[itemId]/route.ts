import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DailyFocus } from '@/models/DailyFocus';
import { Assignment } from '@/models/Assignment';
import { Project } from '@/models/Project';
import { BodyGoal } from '@/models/BodyGoal';
import { requireCurrentUser } from '@/lib/api-helpers';

// PATCH — toggle completed; propagates to the source document
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { itemId } = await params;
  const { completed } = (await req.json()) as { completed: boolean };

  // Update the focus item itself
  const doc = await DailyFocus.findOneAndUpdate(
    { userId: authResult.user.id, 'items._id': itemId },
    { $set: { 'items.$.completed': completed } },
    { new: true }
  ).lean() as any;

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const item = (doc.items as any[]).find((i: any) => i._id.toString() === itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  // Propagate completion to the source — use MongoDB $set directly to avoid
  // triggering the full PUT pipeline (Google Tasks sync not needed here)
  try {
    if (item.sourceType === 'assignment_subtask') {
      await Assignment.updateOne(
        { _id: item.parentId, userId: authResult.user.id, 'subtasks._id': item.sourceId },
        { $set: { 'subtasks.$.completed': completed, 'subtasks.$.status': completed ? 'completed' : 'not_started' } }
      );
    } else if (item.sourceType === 'project_task') {
      await Project.updateOne(
        { _id: item.parentId, userId: authResult.user.id, 'tasks._id': item.sourceId },
        { $set: { 'tasks.$.status': completed ? 'completed' : 'not_started' } }
      );
    } else if (item.sourceType === 'body_goal_subtask') {
      await BodyGoal.updateOne(
        { _id: item.parentId, userId: authResult.user.id, 'subtasks._id': item.sourceId },
        { $set: { 'subtasks.$.completed': completed } }
      );
    }
  } catch {
    // Source update is best-effort — don't fail the whole request
  }

  return NextResponse.json({ ok: true, item });
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
