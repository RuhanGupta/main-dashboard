import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DailyFocus } from '@/models/DailyFocus';
import { requireCurrentUser } from '@/lib/api-helpers';
import type { DailyFocusSourceType } from '@/types';

export async function GET() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return NextResponse.json({ items: [] });

  await connectToDatabase();
  const doc = await DailyFocus.findOne({ userId: authResult.user.id }).lean() as any;
  return NextResponse.json({ items: doc?.items ?? [] });
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { sourceType, sourceId, parentId, title, parentTitle } =
    (await req.json()) as {
      sourceType: DailyFocusSourceType;
      sourceId?: string;
      parentId?: string;
      title: string;
      parentTitle?: string;
    };

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // Upsert the doc and push the new item (prevent duplicates by sourceId)
  const doc = await DailyFocus.findOneAndUpdate(
    { userId: authResult.user.id },
    {
      $push: {
        items: {
          sourceType,
          sourceId: sourceId || new Date().getTime().toString(),
          parentId: parentId || '',
          title: title.trim(),
          parentTitle: parentTitle || '',
          completed: false,
          addedAt: new Date(),
        },
      },
    },
    { new: true, upsert: true }
  ).lean() as any;

  const added = doc.items[doc.items.length - 1];
  return NextResponse.json(added, { status: 201 });
}
