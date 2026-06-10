import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { CounselorShare } from '@/models/CounselorShare';
import { requireCurrentUser } from '@/lib/api-helpers';

function generateToken(): string {
  return randomBytes(24).toString('hex');
}

export async function GET() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();

  let share = await CounselorShare.findOne({ userId: authResult.user.id });
  if (!share) {
    share = await CounselorShare.create({ userId: authResult.user.id, token: generateToken() });
  }

  return NextResponse.json({ token: share.token });
}

export async function POST() {
  const authResult = await requireCurrentUser();
  if (authResult.response) return authResult.response;

  await connectToDatabase();

  const share = await CounselorShare.findOneAndUpdate(
    { userId: authResult.user.id },
    { token: generateToken() },
    { new: true, upsert: true }
  );

  return NextResponse.json({ token: share.token });
}
