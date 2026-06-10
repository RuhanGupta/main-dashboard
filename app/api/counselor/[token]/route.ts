import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CounselorShare } from '@/models/CounselorShare';
import { Assignment } from '@/models/Assignment';
import { Project } from '@/models/Project';

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await connectToDatabase();
  const { token } = await params;

  const share = await CounselorShare.findOne({ token });
  if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [assignments, projects] = await Promise.all([
    Assignment.find({ userId: share.userId, counselorVisible: true }).sort({ dueDate: 1 }).lean(),
    Project.find({ userId: share.userId, counselorVisible: true }).sort({ dueDate: 1 }).lean(),
  ]);

  // Strip subtasks that are individually hidden
  const filteredAssignments = assignments.map((a: any) => ({
    ...a,
    subtasks: (a.subtasks ?? []).filter((s: any) => s.counselorVisible !== false),
  }));

  // Strip tasks that are individually hidden
  const filteredProjects = projects.map((p: any) => ({
    ...p,
    tasks: (p.tasks ?? []).filter((t: any) => t.counselorVisible !== false),
  }));

  return NextResponse.json({ assignments: filteredAssignments, projects: filteredProjects });
}
