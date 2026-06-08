import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Assignment } from '@/models/Assignment';
import { Project } from '@/models/Project';
import { BodyGoal } from '@/models/BodyGoal';
import { Workout } from '@/models/Workout';
import { Habit } from '@/models/Habit';
import { Reflection } from '@/models/Reflection';
import { auth } from '@/lib/auth';

// One-shot migration: reassigns ALL documents in every collection to the
// currently signed-in user's email. Safe to run multiple times (idempotent).
export async function POST() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  await connectToDatabase();

  const collections = [Assignment, Project, BodyGoal, Workout, Habit, Reflection];
  const results: Record<string, number> = {};

  for (const Model of collections) {
    const result = await (Model as any).updateMany({}, { $set: { userId: email } });
    results[Model.modelName] = result.modifiedCount;
  }

  return NextResponse.json({ ok: true, migratedTo: email, results });
}
