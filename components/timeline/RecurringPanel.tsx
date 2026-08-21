'use client';
import Link from 'next/link';
import { BookOpen, Dumbbell, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IAcademicRecurringTask } from '@/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** One repeating workout series, collapsed from its individual occurrences. */
export type RecurringWorkoutSeries = {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  /** Weekday for weekly series; null for daily ones. */
  dayOfWeek: number | null;
  exerciseCount: number;
};

type RecurringPanelProps = {
  academicTasks?: IAcademicRecurringTask[];
  workoutSeries?: RecurringWorkoutSeries[];
};

/**
 * Repeating commitments don't belong on the timeline — they have no start or
 * due date, they just recur. They get their own section so the timeline stays
 * a view of things that actually begin and end.
 */
export function RecurringPanel({ academicTasks = [], workoutSeries = [] }: RecurringPanelProps) {
  const activeAcademic = academicTasks.filter(t => t.active);
  const isEmpty = activeAcademic.length === 0 && workoutSeries.length === 0;

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong/60 py-8 text-center">
        <Repeat className="w-7 h-7 text-border-strong mx-auto mb-2" />
        <p className="text-sm text-foreground font-medium">No repeating commitments yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Weekly study sessions and repeating workouts will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <RecurringGroup
        title="Study sessions"
        href="/academics"
        icon={<BookOpen className="w-3.5 h-3.5 text-academic-deep" />}
        iconBg="bg-academic-soft"
        count={activeAcademic.length}
      >
        {activeAcademic.length === 0 ? (
          <EmptyRow text="No recurring study sessions" />
        ) : (
          [...activeAcademic]
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek || (a.startTime ?? '').localeCompare(b.startTime ?? ''))
            .map(task => (
              <li key={task._id} className="flex items-center gap-2.5 py-1.5">
                <DayChip label={DAY_LABELS[task.dayOfWeek] ?? '—'} tone="academic" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-foreground truncate leading-tight">{task.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">
                    {task.subject}
                    {task.startTime && ` · ${task.startTime}${task.endTime ? `–${task.endTime}` : ''}`}
                  </p>
                </div>
              </li>
            ))
        )}
      </RecurringGroup>

      <RecurringGroup
        title="Repeating workouts"
        href="/body"
        icon={<Dumbbell className="w-3.5 h-3.5 text-body-deep" />}
        iconBg="bg-body-soft"
        count={workoutSeries.length}
      >
        {workoutSeries.length === 0 ? (
          <EmptyRow text="No repeating workouts" />
        ) : (
          [...workoutSeries]
            .sort((a, b) => (a.dayOfWeek ?? -1) - (b.dayOfWeek ?? -1) || a.title.localeCompare(b.title))
            .map(series => (
              <li key={series.id} className="flex items-center gap-2.5 py-1.5">
                <DayChip
                  label={series.frequency === 'daily' ? 'Daily' : DAY_LABELS[series.dayOfWeek ?? 0] ?? '—'}
                  tone="body"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-foreground truncate leading-tight">{series.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">
                    {series.frequency === 'daily' ? 'Every day' : 'Every week'}
                    {series.exerciseCount > 0 &&
                      ` · ${series.exerciseCount} exercise${series.exerciseCount === 1 ? '' : 's'}`}
                  </p>
                </div>
              </li>
            ))
        )}
      </RecurringGroup>
    </div>
  );
}

function RecurringGroup({
  title,
  href,
  icon,
  iconBg,
  count,
  children,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', iconBg)}>{icon}</span>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <span className="text-[11px] text-muted-foreground tabular-nums">{count}</span>
        </div>
        <Link href={href} className="text-xs font-medium text-primary hover:text-primary-deep transition-colors">
          Manage →
        </Link>
      </div>
      <ul className="divide-y divide-border/40">{children}</ul>
    </div>
  );
}

function DayChip({ label, tone }: { label: string; tone: 'academic' | 'body' }) {
  return (
    <span
      className={cn(
        'shrink-0 w-12 text-center text-[10px] font-semibold uppercase tracking-wide rounded-md py-1 border',
        tone === 'academic'
          ? 'bg-academic-soft text-academic-deep border-academic-line'
          : 'bg-body-soft text-body-deep border-body-line'
      )}
    >
      {label}
    </span>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <li className="py-2 text-[13px] text-muted-foreground">{text}</li>;
}
