import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Reflection } from '@/models/Reflection';
import { emptyListResponse, removeClientManagedFields, requireCurrentUser } from '@/lib/api-helpers';

type ReflectionBody = {
  _id?: unknown;
  userId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  googleTaskId?: unknown;
  [key: string]: unknown;
};

export async function GET() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return emptyListResponse();

  await connectToDatabase();
  const reflections = await Reflection.find({ userId: authResult.user.id }).sort({ date: -1 });
  return NextResponse.json(reflections);
}

export async function POST(req: NextRequest) {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();
  const body = (await req.json()) as ReflectionBody;
  removeClientManagedFields(body);
  const reflection = await Reflection.create({ ...body, userId: authResult.user.id });
  return NextResponse.json(reflection, { status: 201 });
}
