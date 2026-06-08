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
  assignment: 'bg-blue-100 text-blue-700 border-blue-200',
  'project-task': 'bg-purple-100 text-purple-700 border-purple-200',
  workout: 'bg-green-100 text-green-700 border-green-200',
  subtask: 'bg-amber-100 text-amber-700 border-amber-200',
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Week View</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const dayEvents = events.filter(e => isSameDay(e.date, day));

          return (
            <div key={i} className="min-h-[140px]">
              {/* Day header */}
              <div className={cn(
                'px-2 py-2 text-center border-b border-gray-100',
                isToday ? 'bg-indigo-50' : 'bg-gray-50'
              )}>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {format(day, 'EEE')}
                </p>
                <p className={cn(
                  'text-lg font-semibold mt-0.5',
                  isToday ? 'text-indigo-600' : 'text-gray-900'
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
                      'px-1.5 py-1 rounded text-xs border truncate',
                      TYPE_COLORS[event.type]
                    )}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 4 && (
                  <p className="text-xs text-gray-400 pl-1">+{dayEvents.length - 4} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
