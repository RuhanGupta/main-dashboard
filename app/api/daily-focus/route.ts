import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { DailyFocus } from '@/models/DailyFocus';
import { requireCurrentUser } from '@/lib/api-helpers';
import type { DailyFocusSourceType, IDailyFocusItem } from '@/types';

export async function GET() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return NextResponse.json({ items: [] });

  await connectToDatabase();
  const doc = await DailyFocus.findOne({ userId: authResult.user.id }).lean() as { items?: IDailyFocusItem[] } | null;
  return NextResponse.json({ items: doc?.items ?? [] });
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { _id, sourceType, sourceId, parentId, title, parentTitle, startDate, dueDate, addedAt, completed } =
    (await req.json()) as {
      _id?: string;
      sourceType: DailyFocusSourceType;
      sourceId?: string;
      parentId?: string;
      title: string;
      parentTitle?: string;
      startDate?: string | null;
      dueDate?: string | null;
      addedAt?: string;
      completed?: boolean;
    };

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const itemId = _id && Types.ObjectId.isValid(_id) ? new Types.ObjectId(_id) : new Types.ObjectId();
  const item = {
    _id: itemId,
    sourceType,
    sourceId: sourceId || itemId.toString(),
    parentId: parentId || '',
    title: title.trim(),
    parentTitle: parentTitle || '',
    startDate: startDate ? new Date(startDate) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
    completed: completed ?? false,
    addedAt: addedAt ? new Date(addedAt) : new Date(),
  };

  await DailyFocus.updateOne(
    { userId: authResult.user.id },
    { $push: { items: item } },
    { upsert: true }
  );

  return NextResponse.json(item, { status: 201 });
}
