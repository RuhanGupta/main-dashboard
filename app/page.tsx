import { Suspense } from 'react';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { PomodoroTimer } from '@/components/dashboard/PomodoroTimer';
import { DashboardTimelineSection } from '@/components/dashboard/DashboardTimelineSection';

export default function DashboardPage() {
  return (
    <div className="flex h-full min-h-screen">
      <div className="flex-1 p-8 overflow-y-auto space-y-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>

        {/* Timeline + recurring commitments stream in separately so the rest of
            the dashboard isn't blocked on their queries. */}
        <Suspense fallback={<TimelineSkeleton />}>
          <DashboardTimelineSection />
        </Suspense>
      </div>
      <div className="w-80 min-h-screen border-l border-border/60 bg-card/40 backdrop-blur-sm p-5 sticky top-0 h-screen overflow-y-auto">
        <PomodoroTimer />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded-xl w-48" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-2xl" />
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4 animate-pulse max-w-6xl">
      <div className="h-6 w-40 bg-muted rounded-lg" />
      <div className="h-56 bg-muted rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-36 bg-muted rounded-2xl" />
        <div className="h-36 bg-muted rounded-2xl" />
      </div>
    </div>
  );
}
