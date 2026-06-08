import { Suspense } from 'react';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { PomodoroTimer } from '@/components/dashboard/PomodoroTimer';

export default function DashboardPage() {
  return (
    <div className="flex h-full min-h-screen">
      <div className="flex-1 p-6 overflow-y-auto">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
      <div className="w-72 min-h-screen border-l border-gray-200 bg-white p-4 sticky top-0 h-screen overflow-y-auto">
        <PomodoroTimer />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-48" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  );
}
