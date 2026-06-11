'use client';
import { format, isSameDay, addDays, subDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { IAssignment, IProject } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'assignment' | 'project-task' | 'workout' | 'subtask';
  priority?: string;
  color?: string;
}

interface WeeklyCalendarProps {
  assignments: IAssignment[];
  projectTasks: Array<{ _id: string; title: string; dueDate?: string; projectTitle?: string }>;
  workouts?: Array<{ _id: string; title: string; date: string }>;
}

const TYPE_COLORS: Record<string, string> = {
  assignment: 'bg-academic-soft text-academic-deep border-academic-line',
  'project-task': 'bg-extracurricular-soft text-extracurricular-deep border-extracurricular-line',
  workout: 'bg-body-soft text-body-deep border-body-line',
  subtask: 'bg-reflection-soft text-reflection-deep border-reflection-line',
};

export function WeeklyCalendar({ assignments, projectTasks, workouts = [] }: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const referenceDate = addDays(today, weekOffset * 7);
  const dayOfWeek = referenceDate.getDay();
  const weekStart = subDays(startOfDay(referenceDate), dayOfWeek);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Build events list
  const events: CalendarEvent[] = [
    ...assignments.flatMap(a => {
      const base: CalendarEvent[] = [];
      if (a.dueDate) {
        base.push({ id: a._id!, title: a.title, date: new Date(a.dueDate), type: 'assignment' });
      }
      a.subtasks?.forEach(s => {
        if (s.dueDate) {
          base.push({ id: s._id!, title: s.title, date: new Date(s.dueDate), type: 'subtask' });
        }
      });
      return base;
    }),
    ...projectTasks
      .filter(t => t.dueDate)
      .map(t => ({
        id: t._id,
        title: `${t.projectTitle ? `[${t.projectTitle}] ` : ''}${t.title}`,
        date: new Date(t.dueDate!),
        type: 'project-task' as const,
      })),
    ...workouts.map(w => ({
      id: w._id,
      title: w.title,
      date: new Date(w.date),
      type: 'workout' as const,
    })),
  ];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <h3 className="font-serif font-semibold text-foreground text-base">Week View</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-secondary/60 text-primary-deep hover:bg-secondary transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 divide-x divide-border/50">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const dayEvents = events.filter(e => isSameDay(e.date, day));

          return (
            <div key={i} className={cn('min-h-[140px]', isToday && 'bg-secondary/20')}>
              {/* Day header */}
              <div className={cn(
                'px-2 py-2.5 text-center border-b border-border/50',
                isToday ? 'bg-secondary/50' : 'bg-muted/50'
              )}>
                <p className={cn(
                  'text-[10px] uppercase tracking-[0.15em]',
                  isToday ? 'text-primary-deep font-semibold' : 'text-muted-foreground'
                )}>
                  {format(day, 'EEE')}
                </p>
                <p className={cn(
                  'text-lg font-serif font-semibold mt-0.5',
                  isToday ? 'text-primary-deep' : 'text-foreground'
                )}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Events */}
              <div className="p-1.5 space-y-1">
                {dayEvents.slice(0, 4).map(event => (
                  <div
                    key={event.id}
                    className={cn(
                      'px-1.5 py-1 rounded-md text-xs border truncate transition-transform duration-150 hover:scale-[1.03]',
                      TYPE_COLORS[event.type]
                    )}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 4 && (
                  <p className="text-xs text-muted-foreground pl-1">+{dayEvents.length - 4} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
