import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CounselorShare } from '@/models/CounselorShare';
import { Assignment } from '@/models/Assignment';
import { Project } from '@/models/Project';
import {
  checkRateLimit,
  getClientKey,
  tooManyRequests,
  withRouteErrorHandling,
} from '@/lib/api-helpers';

// This endpoint is public (counselors have no account), so the share token is
// the only secret. Throttle per-IP so the token space can't be walked.
const MAX_LOOKUPS = 30;
const LOOKUP_WINDOW_MS = 60 * 1000;

export const GET = withRouteErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) => {
  if (!checkRateLimit(`counselor:${getClientKey(req)}`, MAX_LOOKUPS, LOOKUP_WINDOW_MS)) {
    return tooManyRequests();
  }

  await connectToDatabase();
  const { token } = await params;

  const share = await CounselorShare.findOne({ token }).lean<{ userId: string } | null>();
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
});
