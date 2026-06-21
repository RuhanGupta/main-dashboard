'use client';
import { useEffect, useMemo, useState } from 'react';
import { addMonths, subMonths, getDaysInMonth, startOfMonth, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IAssignment, IProject, ISubtask } from '@/types';

// ── Types ────────────────────────────────────────────────────────────

interface BodyGoal {
  _id: string;
  title: string;
  status: string;
  dueDate?: string;
}

type Category = 'academic' | 'project' | 'fitness';

interface RowDef {
  id: string;
  title: string;
  subtitle?: string;
  startDay: number | null;
  endDay: number | null;
  crossesLeft: boolean;
  crossesRight: boolean;
  isMilestone: boolean;
  status: string;
  category: Category;
  depth: 0 | 1;
}

// ── Category config ───────────────────────────────────────────────────

const CAT: Record<Category, {
  label: string;
  parentBar: string;
  childBar: string;
  text: string;
  headerBg: string;
  milestoneParent: string;
  milestoneChild: string;
}> = {
  academic: {
    label: 'Academics',
    parentBar: 'bg-academic opacity-90',
    childBar: 'bg-academic opacity-55',
    text: 'text-academic-deep',
    headerBg: 'bg-academic-soft',
    milestoneParent: 'bg-academic',
    milestoneChild: 'bg-academic opacity-60',
  },
  project: {
    label: 'Projects',
    parentBar: 'bg-extracurricular opacity-90',
    childBar: 'bg-extracurricular opacity-55',
    text: 'text-extracurricular-deep',
    headerBg: 'bg-extracurricular-soft',
    milestoneParent: 'bg-extracurricular',
    milestoneChild: 'bg-extracurricular opacity-60',
  },
  fitness: {
    label: 'Fitness Goals',
    parentBar: 'bg-body opacity-90',
    childBar: 'bg-body opacity-55',
    text: 'text-body-deep',
    headerBg: 'bg-body-soft',
    milestoneParent: 'bg-body',
    milestoneChild: 'bg-body opacity-60',
  },
};

// ── Layout constants ──────────────────────────────────────────────────

const LABEL_W = 210;
const DAY_W   = 32;
const BAR_PAD = 4;    // px margin inside lane for bar top/bottom

// ── Date helpers ──────────────────────────────────────────────────────

function buildRow(
  id: string,
  title: string,
  subtitle: string | undefined,
  rawStart: Date | string | null | undefined,
  rawEnd: Date | string | null | undefined,
  status: string,
  category: Category,
  depth: 0 | 1,
  monthStart: Date,
  daysInMonth: number,
): RowDef | null {
  const sd = rawStart ? new Date(rawStart as string) : null;
  const ed = rawEnd   ? new Date(rawEnd   as string) : null;
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), daysInMonth, 23, 59, 59);
  const inMonth  = (d: Date) =>
    d.getFullYear() === monthStart.getFullYear() && d.getMonth() === monthStart.getMonth();

  let startDay: number | null = null;
  let endDay:   number | null = null;
  let crossesLeft  = false;
  let crossesRight = false;
  let isMilestone  = false;

  if (sd && ed) {
    if (ed < monthStart || sd > monthEnd) return null;
    crossesLeft  = sd < monthStart;
    crossesRight = ed > monthEnd;
    startDay = crossesLeft  ? 1           : sd.getDate();
    endDay   = crossesRight ? daysInMonth : ed.getDate();
  } else if (ed) {
    if (!inMonth(ed)) return null;
    startDay = ed.getDate();
    endDay   = ed.getDate();
    isMilestone = true;
  } else if (sd) {
    if (!inMonth(sd)) return null;
    startDay = sd.getDate();
    endDay   = sd.getDate();
    isMilestone = true;
  } else {
    return null;
  }

  return { id, title, subtitle, startDay, endDay, crossesLeft, crossesRight, isMilestone, status, category, depth };
}

// ── Main component ────────────────────────────────────────────────────

export function SummerTimeline() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [projects, setProjects]       = useState<IProject[]>([]);
  const [goals, setGoals]             = useState<BodyGoal[]>([]);
  const [loading, setLoading]         = useState(true);

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
    today.getMonth()    === currentMonth.getMonth()
      ? today.getDate() : null;

  // Build flat list of rows: parent + children interleaved
  const rows = useMemo<RowDef[]>(() => {
    const out: RowDef[] = [];

    for (const a of assignments) {
      const parent = buildRow(
        String(a._id), a.title, a.course,
        a.startDate, a.dueDate, a.status ?? 'not_started', 'academic', 0,
        currentMonth, daysInMonth,
      );
      if (!parent) continue;
      out.push(parent);
      for (const s of (a.subtasks ?? []) as (ISubtask & { startDate?: string })[]) {
        const child = buildRow(
          `${a._id}-${s._id}`, s.title, undefined,
          s.startDate, s.dueDate, s.status ?? 'not_started', 'academic', 1,
          currentMonth, daysInMonth,
        );
        if (child) out.push(child);
      }
    }

    for (const p of projects) {
      const parent = buildRow(
        String(p._id), p.title, p.description?.slice(0, 40),
        p.startDate, p.dueDate, p.status ?? 'not_started', 'project', 0,
        currentMonth, daysInMonth,
      );
      if (!parent) continue;
      out.push(parent);
      for (const t of (p.tasks ?? []) as any[]) {
        const child = buildRow(
          `${p._id}-${t._id}`, t.title, undefined,
          t.startDate, t.dueDate, t.status ?? 'not_started', 'project', 1,
          currentMonth, daysInMonth,
        );
        if (child) out.push(child);
      }
    }

    for (const g of goals) {
      const row = buildRow(
        g._id, g.title, undefined,
        undefined, g.dueDate, g.status, 'fitness', 0,
        currentMonth, daysInMonth,
      );
      if (row) out.push(row);
    }

    return out;
  }, [assignments, projects, goals, currentMonth, daysInMonth]);

  // Group by category for section headers
  const grouped = useMemo(() => {
    const result: { cat: Category; rows: RowDef[] }[] = [];
    for (const cat of ['academic', 'project', 'fitness'] as Category[]) {
      const catRows = rows.filter(r => r.category === cat);
      if (catRows.length > 0) result.push({ cat, rows: catRows });
    }
    return result;
  }, [rows]);

  const totalW = LABEL_W + daysInMonth * DAY_W;

  return (
    <div className="p-6 sm:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Summer Timeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set start &amp; due dates on items and subtasks to see them here
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className={cn('bg-muted rounded-xl', i % 3 === 0 ? 'h-7' : 'h-10')} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <div style={{ minWidth: totalW }}>

            {/* ── Day-number header ── */}
            <div className="flex border-b border-border sticky top-0 z-20 bg-card">
              <div
                style={{ width: LABEL_W, minWidth: LABEL_W }}
                className="shrink-0 border-r border-border px-4 py-2.5 text-xs font-medium text-muted-foreground"
              >
                {format(currentMonth, 'MMMM yyyy')}
              </div>
              <div className="flex-1 flex">
                {days.map(d => {
                  const dow = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d).getDay();
                  return (
                    <div
                      key={d}
                      style={{ width: DAY_W, minWidth: DAY_W }}
                      className={cn(
                        'text-center text-[11px] py-2.5 border-r border-border/40 last:border-r-0 font-medium select-none',
                        (dow === 0 || dow === 6) && 'bg-muted/50 text-muted-foreground/60',
                        d === todayDay ? 'text-primary font-bold' : 'text-muted-foreground',
                      )}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Empty state ── */}
            {rows.length === 0 && (
              <div className="py-20 text-center">
                <p className="font-serif text-lg text-foreground">No items this month</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                  Add start and due dates to assignments, projects, or their subtasks — they'll appear here as Gantt bars.
                </p>
              </div>
            )}

            {/* ── Grouped sections ── */}
            {grouped.map(({ cat, rows: catRows }) => {
              const cfg = CAT[cat];
              return (
                <div key={cat}>
                  {/* Section header */}
                  <div className={cn('flex border-b border-border/60', cfg.headerBg)}>
                    <div
                      style={{ width: LABEL_W, minWidth: LABEL_W }}
                      className={cn('shrink-0 border-r border-border/40 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest', cfg.text)}
                    >
                      {cfg.label}
                    </div>
                    <ChartLane
                      days={days}
                      daysInMonth={daysInMonth}
                      todayDay={todayDay}
                      monthStart={currentMonth}
                      dayW={DAY_W}
                      height={24}
                      isEmpty
                    />
                  </div>

                  {/* Item rows */}
                  {catRows.map((row, i) => {
                    const isLastInSection = i === catRows.length - 1;
                    const rowH = row.depth === 0 ? 44 : 30;
                    return (
                      <div
                        key={row.id}
                        className={cn(
                          'flex',
                          isLastInSection ? 'border-b border-border/60' : 'border-b border-border/30',
                          row.depth === 1 && 'bg-muted/10',
                          'hover:bg-muted/20 transition-colors',
                        )}
                      >
                        {/* Label */}
                        <div
                          style={{ width: LABEL_W, minWidth: LABEL_W, height: rowH }}
                          className="shrink-0 border-r border-border/40 flex flex-col justify-center overflow-hidden"
                        >
                          <div className={cn('flex items-center gap-1.5', row.depth === 1 ? 'pl-8 pr-3' : 'px-4')}>
                            {row.depth === 1 && (
                              <span className="w-2 h-px bg-border-strong shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className={cn(
                                'font-medium text-foreground truncate leading-tight',
                                row.depth === 0 ? 'text-[12px]' : 'text-[11px]',
                                row.status === 'completed' && 'line-through text-muted-foreground',
                              )}>
                                {row.title}
                              </p>
                              {row.subtitle && (
                                <p className="text-[10px] text-muted-foreground truncate leading-tight">{row.subtitle}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Chart lane */}
                        <ChartLane
                          days={days}
                          daysInMonth={daysInMonth}
                          todayDay={todayDay}
                          monthStart={currentMonth}
                          dayW={DAY_W}
                          height={rowH}
                          row={row}
                          cfg={cfg}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 px-1">
          {(['academic', 'project', 'fitness'] as Category[]).map(cat => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className={cn('w-5 h-3 rounded-full', CAT[cat].milestoneParent)} />
              <span className="text-xs text-muted-foreground">{CAT[cat].label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-1.5 rounded-full bg-foreground/30" />
            <span className="text-xs text-muted-foreground">Subtask / task</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rotate-45 rounded-[2px] bg-foreground/40" />
            <span className="text-xs text-muted-foreground">Single date</span>
          </div>
          {todayDay && (
            <div className="flex items-center gap-1.5">
              <div className="w-[2px] h-4 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ChartLane ─────────────────────────────────────────────────────────

function ChartLane({
  days,
  daysInMonth,
  todayDay,
  monthStart,
  dayW,
  height,
  row,
  cfg,
  isEmpty = false,
}: {
  days: number[];
  daysInMonth: number;
  todayDay: number | null;
  monthStart: Date;
  dayW: number;
  height: number;
  row?: RowDef;
  cfg?: (typeof CAT)[Category];
  isEmpty?: boolean;
}) {
  return (
    <div className="flex-1 relative" style={{ height }}>
      {/* Weekend shading */}
      {days.map(d => {
        const dow = new Date(monthStart.getFullYear(), monthStart.getMonth(), d).getDay();
        if (dow !== 0 && dow !== 6) return null;
        return (
          <div
            key={d}
            className="absolute top-0 bottom-0 bg-muted/25 pointer-events-none"
            style={{ left: (d - 1) * dayW, width: dayW }}
          />
        );
      })}

      {/* Today line */}
      {todayDay && (
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-primary/20 pointer-events-none z-10"
          style={{ left: (todayDay - 0.5) * dayW - 1 }}
        />
      )}

      {/* Column separators */}
      {!isEmpty && days.map(d => (
        <div
          key={d}
          className="absolute top-0 bottom-0 border-r border-border/20 pointer-events-none"
          style={{ left: d * dayW - 1 }}
        />
      ))}

      {/* Bar or milestone */}
      {row && cfg && row.startDay !== null && row.endDay !== null && (
        row.isMilestone
          ? <MilestoneShape row={row} cfg={cfg} daysInMonth={daysInMonth} dayW={dayW} height={height} />
          : <GanttBar row={row} cfg={cfg} daysInMonth={daysInMonth} dayW={dayW} height={height} />
      )}
    </div>
  );
}

// ── GanttBar ──────────────────────────────────────────────────────────

function GanttBar({
  row, cfg, daysInMonth, dayW, height,
}: {
  row: RowDef;
  cfg: (typeof CAT)[Category];
  daysInMonth: number;
  dayW: number;
  height: number;
}) {
  const isParent = row.depth === 0;
  const barH     = isParent ? height - BAR_PAD * 2 : height - BAR_PAD * 2.5;
  const barTop   = isParent ? BAR_PAD : BAR_PAD * 1.25;

  const left  = (row.startDay! - 1) * dayW + (row.crossesLeft  ? 0 : 3);
  const right = (daysInMonth - row.endDay!) * dayW + (row.crossesRight ? 0 : 3);
  const width = (row.endDay! - row.startDay! + 1) * dayW
    - (row.crossesLeft  ? 0 : 3)
    - (row.crossesRight ? 0 : 3);

  const barClass = isParent ? cfg.parentBar : cfg.childBar;
  const roundL = row.crossesLeft  ? 'rounded-l-none' : 'rounded-l-full';
  const roundR = row.crossesRight ? 'rounded-r-none' : 'rounded-r-full';

  return (
    <div
      className={cn(
        'absolute flex items-center overflow-hidden z-10',
        barClass,
        roundL,
        roundR,
        row.status === 'completed' && 'opacity-40',
      )}
      style={{ left, top: barTop, height: barH, width: Math.max(width, 4) }}
      title={`${row.title}${row.subtitle ? ` · ${row.subtitle}` : ''}`}
    >
      {/* Arrow caps for cross-month bars */}
      {row.crossesLeft && (
        <span className="text-white/80 text-[9px] pl-1 leading-none shrink-0">◂</span>
      )}
      {width > 28 && (
        <span
          className={cn(
            'truncate leading-none select-none',
            isParent ? 'text-[10px] font-semibold text-white px-2' : 'text-[9px] font-medium text-white/90 px-1.5',
          )}
        >
          {row.title}
        </span>
      )}
      {row.crossesRight && (
        <span className="text-white/80 text-[9px] pr-1 ml-auto leading-none shrink-0">▸</span>
      )}
    </div>
  );
}

// ── MilestoneShape ────────────────────────────────────────────────────

function MilestoneShape({
  row, cfg, daysInMonth, dayW, height,
}: {
  row: RowDef;
  cfg: (typeof CAT)[Category];
  daysInMonth: number;
  dayW: number;
  height: number;
}) {
  const isParent = row.depth === 0;
  const cx = (row.startDay! - 0.5) * dayW;
  const size = isParent ? 14 : 9;

  return (
    <div
      className={cn(
        'absolute z-10 rotate-45 rounded-[3px]',
        isParent ? cfg.milestoneParent : cfg.milestoneChild,
        row.status === 'completed' && 'opacity-40',
      )}
      style={{
        width: size,
        height: size,
        left: cx - size / 2,
        top: height / 2 - size / 2,
      }}
      title={row.title}
    />
  );
}
