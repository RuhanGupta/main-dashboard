import Link from 'next/link';
import { CalendarRange, Repeat } from 'lucide-react';
import { Timeline } from '@/components/timeline/Timeline';
import { RecurringPanel } from '@/components/timeline/RecurringPanel';
import {
  getAssignments,
  getProjects,
  getBodyGoals,
  getAcademicRecurringTasks,
  getRecurringWorkoutSeries,
} from '@/lib/server-data';

/**
 * The dashboard's planning block: a six-week lookahead of everything with real
 * dates, plus a separate section for commitments that repeat instead.
 */
export async function DashboardTimelineSection() {
  const [assignments, projects, bodyGoals, academicTasks, workoutSeries] = await Promise.all([
    getAssignments(),
    getProjects(),
    getBodyGoals(),
    getAcademicRecurringTasks(),
    getRecurringWorkoutSeries(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl">
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarRange className="w-3.5 h-3.5 text-primary-deep" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground text-sm">Timeline</h2>
              <p className="text-[11px] text-muted-foreground">Last week and the next four</p>
            </div>
          </div>
          <Link
            href="/summer-timeline"
            className="text-xs font-medium text-primary hover:text-primary-deep transition-colors"
          >
            Full view →
          </Link>
        </div>

        <Timeline
          variant="compact"
          assignments={assignments}
          projects={projects}
          bodyGoals={bodyGoals}
        />
      </section>

      <section>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
            <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
          </span>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Recurring</h2>
            <p className="text-[11px] text-muted-foreground">Commitments that repeat, not one-off deadlines</p>
          </div>
        </div>

        <RecurringPanel academicTasks={academicTasks} workoutSeries={workoutSeries} />
      </section>
    </div>
  );
}
