import { CalendarRange } from 'lucide-react';
import { Timeline } from '@/components/timeline/Timeline';
import { RecurringPanel } from '@/components/timeline/RecurringPanel';
import {
  getAssignments,
  getProjects,
  getBodyGoals,
  getAcademicRecurringTasks,
  getRecurringWorkoutSeries,
} from '@/lib/server-data';

export const metadata = { title: 'Timeline — Student Dashboard' };

export default async function TimelinePage() {
  const [assignments, projects, bodyGoals, academicTasks, workoutSeries] = await Promise.all([
    getAssignments(),
    getProjects(),
    getBodyGoals(),
    getAcademicRecurringTasks(),
    getRecurringWorkoutSeries(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto stagger">
      <div className="flex items-center gap-3.5 mb-7">
        <div className="w-11 h-11 bg-primary/10 border border-border rounded-2xl flex items-center justify-center shadow-card">
          <CalendarRange className="w-5 h-5 text-primary-deep" />
        </div>
        <div>
          <h1 className="font-serif text-[1.75rem] font-semibold text-foreground tracking-tight">Timeline</h1>
          <p className="text-sm text-muted-foreground">
            Everything with a start or due date, laid out week by week
          </p>
        </div>
      </div>

      <Timeline variant="full" assignments={assignments} projects={projects} bodyGoals={bodyGoals} />

      <div className="mt-9">
        <h2 className="font-serif text-lg font-semibold text-foreground mb-1">Recurring commitments</h2>
        <p className="text-sm text-muted-foreground mb-4">
          These repeat on a schedule, so they don&apos;t appear on the timeline above.
        </p>
        <RecurringPanel academicTasks={academicTasks} workoutSeries={workoutSeries} />
      </div>
    </div>
  );
}
