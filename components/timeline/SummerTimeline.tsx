'use client';
import { useEffect, useMemo, useState } from 'react';
import { addMonths, subMonths, getDaysInMonth, startOfMonth, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IAssignment, IProject } from '@/types';

interface BodyGoal {
  _id: string;
  title: string;
  status: string;
  dueDate?: string;
  notes?: string;
}

type Category = 'academic' | 'project' | 'fitness';

interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  startDay: number | null;
  endDay: number | null;
  isMilestone: boolean;
  status: string;
  category: Category;
}

const CATEGORY_CONFIG: Record<Category, { label: string; bar: string; text: string; header: string }> = {
  academic: {
    label: 'Academics',
    bar: 'bg-academic',
    text: 'text-academic-deep',
    header: 'bg-academic-soft',
  },
  project: {
    label: 'Projects',
    bar: 'bg-extracurricular',
    text: 'text-extracurricular-deep',
    header: 'bg-extracurricular-soft',
  },
  fitness: {
    label: 'Fitness Goals',
    bar: 'bg-body',
    text: 'text-body-deep',
    header: 'bg-body-soft',
  },
};

function getMonthOverlap(
  startDate: Date | null,
  endDate: Date | null,
  monthStart: Date,
  daysInMonth: number,
): { startDay: number | null; endDay: number | null; isMilestone: boolean } {
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), daysInMonth, 23, 59, 59);
  const inThisMonth = (d: Date) =>
    d.getFullYear() === monthStart.getFullYear() && d.getMonth() === monthStart.getMonth();

  if (startDate && endDate) {
    // Bar: show if range overlaps with this month
    if (endDate < monthStart || startDate > monthEnd) return { startDay: null, endDay: null, isMilestone: false };
    const sd = startDate < monthStart ? 1 : startDate.getDate();
    const ed = endDate > monthEnd ? daysInMonth : endDate.getDate();
    return { startDay: sd, endDay: ed, isMilestone: false };
  }

  if (endDate) {
    // Milestone: only show in the month the date falls in
    if (!inThisMonth(endDate)) return { startDay: null, endDay: null, isMilestone: true };
    return { startDay: endDate.getDate(), endDay: endDate.getDate(), isMilestone: true };
  }

  if (startDate) {
    if (!inThisMonth(startDate)) return { startDay: null, endDay: null, isMilestone: true };
    return { startDay: startDate.getDate(), endDay: startDate.getDate(), isMilestone: true };
  }

  return { startDay: null, endDay: null, isMilestone: false };
}

function toItem(
  raw: IAssignment | IProject | (BodyGoal & { startDate?: string }),
  category: Category,
  monthStart: Date,
  daysInMonth: number,
  subtitle?: string,
): TimelineItem | null {
  const startDate = raw.startDate ? new Date(raw.startDate as string) : null;
  const endDate = raw.dueDate ? new Date(raw.dueDate as string) : null;

  const { startDay, endDay, isMilestone } = getMonthOverlap(startDate, endDate, monthStart, daysInMonth);
  if (startDay === null && endDay === null) return null;

  return {
    id: String((raw as { _id?: string })._id ?? Math.random()),
    title: raw.title,
    subtitle,
    startDay,
    endDay,
    isMilestone,
    status: (raw as { status?: string }).status ?? 'not_started',
    category,
  };
}

export function SummerTimeline() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [projects, setProjects] = useState<IProject[]>([]);
  const [goals, setGoals] = useState<BodyGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/assignments').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/body-goals').then(r => r.json()),
    ]).then(([a, p, g]) => {
      setAssignments(Array.isArray(a) ? a : []);
      setProjects(Array.isArray(p) ? p : []);
      setGoals(Array.isArray(g) ? g : []);
    }).finally(() => setLoading(false));
  }, []);

  const daysInMonth = getDaysInMonth(currentMonth);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const today = new Date();
  const todayDay =
    today.getFullYear() === currentMonth.getFullYear() &&
    today.getMonth() === currentMonth.getMonth()
      ? today.getDate()
      : null;

  const grouped = useMemo(() => {
    const academic: TimelineItem[] = [];
    const project: TimelineItem[] = [];
    const fitness: TimelineItem[] = [];

    for (const a of assignments) {
      const item = toItem(a, 'academic', currentMonth, daysInMonth, a.course);
      if (item) academic.push(item);
    }
    for (const p of projects) {
      const item = toItem(p, 'project', currentMonth, daysInMonth, p.description?.slice(0, 50));
      if (item) project.push(item);
    }
    for (const g of goals) {
      const item = toItem(g as BodyGoal & { startDate?: string }, 'fitness', currentMonth, daysInMonth);
      if (item) fitness.push(item);
    }

    return { academic, project, fitness };
  }, [assignments, projects, goals, currentMonth, daysInMonth]);

  const totalItems = grouped.academic.length + grouped.project.length + grouped.fitness.length;

  const LABEL_W = 192; // px — label column width
  const DAY_W = 32;    // px — minimum width per day column

  return (
    <div className="p-6 sm:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Summer Timeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your plan at a glance — set start &amp; due dates on items to see them here</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-2 rounded-full border border-border hover:bg-muted transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-serif font-semibold text-foreground w-[130px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-2 rounded-full border border-border hover:bg-muted transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-10 bg-muted rounded-xl" />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <div style={{ minWidth: LABEL_W + daysInMonth * DAY_W }}>

            {/* Day-number header row */}
            <div className="flex border-b border-border bg-card sticky top-0 z-20">
              <div
                style={{ width: LABEL_W, minWidth: LABEL_W }}
                className="shrink-0 border-r border-border px-4 py-2.5 text-xs font-medium text-muted-foreground"
              >
                {format(currentMonth, 'MMMM yyyy')}
              </div>
              <div className="flex-1 flex">
                {days.map(d => {
                  const dow = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d).getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  const isToday = d === todayDay;
                  return (
                    <div
                      key={d}
                      style={{ width: DAY_W, minWidth: DAY_W }}
                      className={cn(
                        'text-center text-[11px] py-2.5 border-r border-border/40 last:border-r-0 font-medium',
                        isWeekend && 'bg-muted/50',
                        isToday ? 'text-primary font-bold' : 'text-muted-foreground',
                      )}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Groups */}
            {totalItems === 0 ? (
              <div className="py-20 text-center">
                <p className="font-serif text-lg text-foreground">No items this month</p>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Add start and due dates to assignments and projects, or target dates to fitness goals.
                </p>
              </div>
            ) : (
              (['academic', 'project', 'fitness'] as Category[]).map(cat => {
                const items = grouped[cat];
                if (items.length === 0) return null;
                const cfg = CATEGORY_CONFIG[cat];
                return (
                  <div key={cat}>
                    {/* Group header */}
                    <div className={cn('flex border-b border-border', cfg.header)}>
                      <div
                        style={{ width: LABEL_W, minWidth: LABEL_W }}
                        className={cn('shrink-0 border-r border-border px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest', cfg.text)}
                      >
                        {cfg.label}
                      </div>
                      <div className="flex-1 flex">
                        {days.map(d => {
                          const dow = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d).getDay();
                          return (
                            <div
                              key={d}
                              style={{ width: DAY_W, minWidth: DAY_W }}
                              className={cn(
                                'border-r border-border/30 last:border-r-0',
                                (dow === 0 || dow === 6) && 'bg-muted/30',
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Item rows */}
                    {items.map(item => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        days={days}
                        daysInMonth={daysInMonth}
                        todayDay={todayDay}
                        labelW={LABEL_W}
                        dayW={DAY_W}
                        cfg={cfg}
                        monthStart={currentMonth}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 px-1">
          {(['academic', 'project', 'fitness'] as Category[]).map(cat => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className={cn('w-4 h-2.5 rounded-full', CATEGORY_CONFIG[cat].bar)} />
              <span className="text-xs text-muted-foreground">{CATEGORY_CONFIG[cat].label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rotate-45 rounded-[2px] bg-foreground/50" />
            <span className="text-xs text-muted-foreground">Single date (milestone)</span>
          </div>
          {todayDay && (
            <div className="flex items-center gap-1.5">
              <div className="w-[2px] h-3.5 bg-primary rounded-full" />
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item,
  days,
  daysInMonth,
  todayDay,
  labelW,
  dayW,
  cfg,
  monthStart,
}: {
  item: TimelineItem;
  days: number[];
  daysInMonth: number;
  todayDay: number | null;
  labelW: number;
  dayW: number;
  cfg: { bar: string; text: string };
  monthStart: Date;
}) {
  const ROW_H = 40;
  const BAR_PAD = 5;

  return (
    <div className="flex border-b border-border/50 hover:bg-muted/20 transition-colors">
      {/* Label */}
      <div
        style={{ width: labelW, minWidth: labelW, height: ROW_H }}
        className="shrink-0 border-r border-border/60 px-4 flex flex-col justify-center"
      >
        <p className="text-[12px] font-medium text-foreground truncate leading-tight">{item.title}</p>
        {item.subtitle && (
          <p className="text-[11px] text-muted-foreground truncate leading-tight">{item.subtitle}</p>
        )}
      </div>

      {/* Chart lane */}
      <div className="flex-1 relative" style={{ height: ROW_H }}>
        {/* Weekend column shading */}
        {days.map(d => {
          const dow = new Date(monthStart.getFullYear(), monthStart.getMonth(), d).getDay();
          if (dow !== 0 && dow !== 6) return null;
          return (
            <div
              key={d}
              className="absolute top-0 bottom-0 bg-muted/30 pointer-events-none"
              style={{ left: (d - 1) * dayW, width: dayW }}
            />
          );
        })}

        {/* Today line */}
        {todayDay && (
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-primary/25 pointer-events-none"
            style={{ left: (todayDay - 0.5) * dayW }}
          />
        )}

        {/* Bar or milestone */}
        {item.startDay !== null && item.endDay !== null && (
          item.isMilestone ? (
            // Diamond
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: (item.startDay - 0.5) * dayW }}
              title={item.title}
            >
              <div
                className={cn(
                  'w-3 h-3 rotate-45 rounded-[2px]',
                  cfg.bar,
                  item.status === 'completed' ? 'opacity-40' : 'opacity-85',
                )}
              />
            </div>
          ) : (
            // Gantt bar
            <div
              className={cn(
                'absolute flex items-center px-2 rounded-full overflow-hidden',
                cfg.bar,
                item.status === 'completed' ? 'opacity-35' : 'opacity-85',
              )}
              style={{
                left: (item.startDay - 1) * dayW + BAR_PAD,
                top: BAR_PAD,
                bottom: BAR_PAD,
                width: Math.max((item.endDay - item.startDay + 1) * dayW - BAR_PAD * 2, 8),
              }}
              title={item.title}
            >
              <span className="text-[10px] font-semibold text-white truncate leading-none select-none">
                {item.title}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
