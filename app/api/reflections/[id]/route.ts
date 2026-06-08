import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Reflection } from '@/models/Reflection';
import { removeClientManagedFields, requireCurrentUser } from '@/lib/api-helpers';

type ReflectionBody = {
  _id?: unknown;
  userId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  googleTaskId?: unknown;
  [key: string]: unknown;
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const body = (await req.json()) as ReflectionBody;
  removeClientManagedFields(body);
  const reflection = await Reflection.findOneAndUpdate(
    { _id: id, userId: authResult.user.id },
    { ...body, userId: authResult.user.id },
    { new: true }
  );
  if (!reflection) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(reflection);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const { id } = await params;
  const reflection = await Reflection.findOneAndDelete({ _id: id, userId: authResult.user.id });
  if (!reflection) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
