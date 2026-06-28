'use client';
import { format, isSameDay, addDays, subDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { IAssignment, IAcademicRecurringTask, AcademicTaskStatus } from '@/types';
import { ChevronLeft, ChevronRight, Dumbbell, GraduationCap, Circle, CircleDot, CheckCircle2, BookOpen, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DashboardWorkout {
  _id: string;
  title: string;
  date: string;
  exercises?: unknown[];
  completed?: boolean;
}

interface OneTimeEvent {
  id: string;
  title: string;
  date: Date;
  type: 'assignment' | 'project-task' | 'subtask';
}

interface WeeklyCalendarProps {
  assignments: IAssignment[];
  projectTasks: Array<{ _id: string; title: string; dueDate?: string; projectTitle?: string }>;
  workouts?: DashboardWorkout[];
  academicRecurringTasks?: IAcademicRecurringTask[];
}

const EVENT_ACCENT: Record<OneTimeEvent['type'], string> = {
  assignment: 'bg-academic',
  'project-task': 'bg-extracurricular',
  subtask: 'bg-reflection',
};

const EVENT_ICON: Record<OneTimeEvent['type'], typeof BookOpen> = {
  assignment: BookOpen,
  'project-task': Star,
  subtask: BookOpen,
};

const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');

const ACADEMIC_ORDER: AcademicTaskStatus[] = ['not_started', 'in_progress', 'completed'];

function statusIcon(status: AcademicTaskStatus) {
  if (status === 'completed') return CheckCircle2;
  if (status === 'in_progress') return CircleDot;
  return Circle;
}

export function WeeklyCalendar({ assignments, projectTasks, workouts = [], academicRecurringTasks = [] }: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  // Local, optimistic copies so status toggles feel instant.
  const [localWorkouts, setLocalWorkouts] = useState<DashboardWorkout[]>(workouts);
  const [localTasks, setLocalTasks] = useState<IAcademicRecurringTask[]>(academicRecurringTasks);

  useEffect(() => setLocalWorkouts(workouts), [workouts]);
  useEffect(() => setLocalTasks(academicRecurringTasks), [academicRecurringTasks]);

  const today = new Date();
  const referenceDate = addDays(today, weekOffset * 7);
  const weekStart = subDays(startOfDay(referenceDate), referenceDate.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const oneTimeEvents: OneTimeEvent[] = [
    ...assignments.flatMap(a => {
      const base: OneTimeEvent[] = [];
      if (a.dueDate) base.push({ id: a._id!, title: a.title, date: new Date(a.dueDate), type: 'assignment' });
      a.subtasks?.forEach(s => {
        if (s.dueDate) base.push({ id: s._id!, title: s.title, date: new Date(s.dueDate), type: 'subtask' });
      });
      return base;
    }),
    ...projectTasks.filter(t => t.dueDate).map(t => ({
      id: t._id,
      title: `${t.projectTitle ? `${t.projectTitle}: ` : ''}${t.title}`,
      date: new Date(t.dueDate!),
      type: 'project-task' as const,
    })),
  ];

  const eventsForDay = (day: Date) => oneTimeEvents.filter(e => isSameDay(e.date, day));
  const workoutsForDay = (day: Date) => localWorkouts.filter(w => isSameDay(new Date(w.date), day));
  const tasksForDay = (day: Date) =>
    localTasks
      .filter(t => t.active && t.dayOfWeek === day.getDay())
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));

  const statusForDate = (task: IAcademicRecurringTask, key: string): AcademicTaskStatus =>
    task.completionLog?.find(r => r.date === key)?.status ?? 'not_started';

  const cycleAcademic = (task: IAcademicRecurringTask, key: string) => {
    const current = statusForDate(task, key);
    const next = ACADEMIC_ORDER[(ACADEMIC_ORDER.indexOf(current) + 1) % ACADEMIC_ORDER.length];
    setLocalTasks(prev => prev.map(t => {
      if (t._id !== task._id) return t;
      const log = [...(t.completionLog ?? [])];
      const idx = log.findIndex(r => r.date === key);
      const record = { date: key, status: next, completedAt: next === 'completed' ? new Date().toISOString() : undefined };
      if (idx >= 0) log[idx] = { ...log[idx], ...record };
      else log.push(record);
      return { ...t, completionLog: log };
    }));
    fetch(`/api/academic-recurring-tasks/${task._id}/completion`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: key, status: next }),
    });
  };

  const toggleWorkout = (workout: DashboardWorkout) => {
    const next = !workout.completed;
    setLocalWorkouts(prev => prev.map(w => (w._id === workout._id ? { ...w, completed: next } : w)));
    fetch(`/api/workouts/${workout._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...workout, completed: next }),
    });
  };

  return (
    <div className="bg-card/70 rounded-3xl border border-border shadow-card overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/70">
        <div>
          <h3 className="font-serif font-semibold text-foreground text-base">Week View</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(days[0], 'MMM d')} – {format(days[6], 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Legend />
          <div className="flex items-center gap-1.5">
            <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary/60 text-foreground hover:bg-secondary transition-colors">
              Today
            </button>
            <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-px bg-border/50 p-px">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const key = dateKey(day);
          const dayEvents = eventsForDay(day);
          const dayWorkouts = workoutsForDay(day);
          const dayTasks = tasksForDay(day);
          const isEmpty = !dayEvents.length && !dayWorkouts.length && !dayTasks.length;

          return (
            <div key={i} className={cn('flex flex-col bg-card/60', isToday && 'bg-primary/10')}>
              {/* Day header */}
              <div className={cn('px-2.5 py-2.5 text-center border-b border-border/40', isToday && 'border-primary/30')}>
                <p className={cn('text-[10px] uppercase tracking-[0.18em]', isToday ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                  {format(day, 'EEE')}
                </p>
                <p className={cn('text-lg font-serif font-semibold mt-0.5 leading-none', isToday ? 'text-primary' : 'text-foreground')}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Items */}
              <div className="flex-1 p-1.5 space-y-2.5 min-h-[230px] max-h-[300px] overflow-y-auto">
                {/* Academics — toggleable */}
                {dayTasks.length > 0 && (
                  <Group label="Academics" icon={GraduationCap} accent="text-academic-deep">
                    {dayTasks.map(t => {
                      const status = statusForDate(t, key);
                      const Icon = statusIcon(status);
                      return (
                        <StatusRow
                          key={t._id}
                          title={t.title}
                          meta={t.startTime}
                          tone="academic"
                          status={status}
                          Icon={Icon}
                          onClick={() => cycleAcademic(t, key)}
                        />
                      );
                    })}
                  </Group>
                )}

                {/* Workouts — toggleable */}
                {dayWorkouts.length > 0 && (
                  <Group label="Workout" icon={Dumbbell} accent="text-body-deep">
                    {dayWorkouts.map(w => (
                      <StatusRow
                        key={w._id}
                        title={w.title}
                        meta={(w.exercises?.length ?? 0) > 0 ? `${w.exercises!.length} ex` : undefined}
                        tone="body"
                        status={w.completed ? 'completed' : 'not_started'}
                        Icon={w.completed ? CheckCircle2 : Circle}
                        onClick={() => toggleWorkout(w)}
                      />
                    ))}
                  </Group>
                )}

                {/* One-time due items — read only */}
                {dayEvents.length > 0 && (
                  <div className="space-y-1">
                    {dayEvents.map(e => {
                      const Icon = EVENT_ICON[e.type];
                      return (
                        <div key={e.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-muted/40" title={e.title}>
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', EVENT_ACCENT[e.type])} />
                          <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-[11px] text-foreground/90 truncate">{e.title}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isEmpty && (
                  <div className="h-full min-h-[180px] flex items-center justify-center">
                    <span className="text-[11px] text-muted-foreground/40">—</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Group({ label, icon: Icon, accent, children }: { label: string; icon: typeof Dumbbell; accent: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 px-1">
        <Icon className={cn('w-3 h-3', accent)} />
        <span className={cn('text-[9px] font-semibold uppercase tracking-[0.14em]', accent)}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function StatusRow({ title, meta, tone, status, Icon, onClick }: {
  title: string;
  meta?: string;
  tone: 'academic' | 'body';
  status: AcademicTaskStatus;
  Icon: typeof Circle;
  onClick: () => void;
}) {
  const completed = status === 'completed';
  const inProgress = status === 'in_progress';
  const toneSoft = tone === 'academic' ? 'bg-academic-soft border-academic-line' : 'bg-body-soft border-body-line';
  const iconColor = completed
    ? 'text-success-deep'
    : inProgress
      ? (tone === 'academic' ? 'text-academic-deep' : 'text-body-deep')
      : 'text-muted-foreground/60';

  return (
    <button
      onClick={onClick}
      title={`${title} — ${status.replace('_', ' ')} (click to change)`}
      className={cn(
        'group w-full flex items-center gap-1.5 px-1.5 py-1 rounded-lg border text-left transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]',
        completed ? 'bg-success-soft border-success-line' : toneSoft
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 flex-shrink-0 transition-colors', iconColor)} />
      <span className={cn('text-[11px] flex-1 truncate', completed ? 'text-success-deep line-through opacity-70' : 'text-foreground')}>
        {title}
      </span>
      {meta && <span className="text-[9px] text-muted-foreground tabular-nums flex-shrink-0">{meta}</span>}
    </button>
  );
}

function Legend() {
  return (
    <div className="hidden lg:flex items-center gap-3 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1"><Circle className="w-3 h-3" /> To do</span>
      <span className="flex items-center gap-1"><CircleDot className="w-3 h-3 text-academic-deep" /> Ongoing</span>
      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success-deep" /> Done</span>
    </div>
  );
}
