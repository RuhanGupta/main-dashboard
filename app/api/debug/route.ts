import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Assignment } from '@/models/Assignment';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  await connectToDatabase();

  // Show the first 5 assignments regardless of userId so we can see what's stored
  const rawDocs = await Assignment.find({}).limit(5).lean();

  return NextResponse.json({
    session: {
      userId_from_session_user_id: session?.user?.id,
      userId_from_email: session?.user?.email,
      userId_from_token_sub: (session as any)?.token?.sub,
    },
    first_5_assignments_in_db: rawDocs.map((d: any) => ({
      _id: d._id,
      title: d.title,
      userId: d.userId,
    })),
  });
}
