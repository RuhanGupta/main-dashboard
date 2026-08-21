'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { addDays, format, isSameDay } from 'date-fns';
import { CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildTimelineRange,
  buildTimelineRows,
  groupByCategory,
  todayOffsetPct,
  type TimelineCategory,
  type TimelineInput,
  type TimelineRow,
} from '@/lib/timeline';

const CATEGORY: Record<TimelineCategory, { label: string; bar: string; childBar: string; text: string; header: string }> = {
  academic: {
    label: 'Academics',
    bar: 'bg-academic',
    childBar: 'bg-academic/55',
    text: 'text-academic-deep',
    header: 'bg-academic-soft',
  },
  project: {
    label: 'Extracurriculars',
    bar: 'bg-extracurricular',
    childBar: 'bg-extracurricular/55',
    text: 'text-extracurricular-deep',
    header: 'bg-extracurricular-soft',
  },
  fitness: {
    label: 'Fitness Goals',
    bar: 'bg-body',
    childBar: 'bg-body/55',
    text: 'text-body-deep',
    header: 'bg-body-soft',
  },
};

type TimelineProps = TimelineInput & {
  /** `compact` is the dashboard embed; `full` is the standalone page. */
  variant?: 'compact' | 'full';
};

export function Timeline({ variant = 'compact', ...data }: TimelineProps) {
  const isFull = variant === 'full';
  // The full page can widen the window; the dashboard stays at six weeks.
  const [weeksAfter, setWeeksAfter] = useState(4);

  const range = useMemo(
    () => buildTimelineRange(1, isFull ? weeksAfter : 4),
    [isFull, weeksAfter]
  );
  const rows = useMemo(() => buildTimelineRows(data, range), [data, range]);
  const groups = useMemo(() => groupByCategory(rows), [rows]);
  const markerPct = todayOffsetPct(range);

  const labelW = isFull ? 240 : 168;
  const rowH = isFull ? 34 : 26;
  const childRowH = isFull ? 26 : 22;

  return (
    <div>
      {isFull && (
        <div className="flex items-center justify-end gap-1 mb-3">
          <span className="text-xs text-muted-foreground mr-1">Show</span>
          {[4, 8, 12].map(w => (
            <button
              key={w}
              onClick={() => setWeeksAfter(w)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                weeksAfter === w
                  ? 'bg-foreground text-card'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {w + 2} weeks
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong/60 py-10 text-center">
          <CalendarRange className="w-8 h-8 text-border-strong mx-auto mb-2.5" />
          <p className="font-serif text-foreground">Nothing scheduled in this window</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Give assignments, projects or goals a start and due date and they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <div className={isFull ? 'min-w-[720px]' : 'min-w-[560px]'}>

              {/* Week header */}
              <div className="flex border-b border-border sticky top-0 bg-card z-10">
                <div
                  style={{ width: labelW, minWidth: labelW }}
                  className="shrink-0 border-r border-border px-3.5 py-2 text-[11px] font-medium text-muted-foreground"
                >
                  {format(range.start, 'MMM d')} – {format(range.end, 'MMM d')}
                </div>
                <div className="flex-1 flex relative">
                  {range.weekStarts.map((w, i) => {
                    const isCurrentWeek = isSameDay(w, currentWeekStart(range.weekStarts));
                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex-1 text-center text-[11px] py-2 border-r border-border/40 last:border-r-0 select-none',
                          isCurrentWeek ? 'text-primary font-semibold bg-primary/5' : 'text-muted-foreground'
                        )}
                      >
                        {format(w, 'MMM d')}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category groups */}
              {groups.map(({ category, rows: catRows }) => {
                const cfg = CATEGORY[category];
                return (
                  <div key={category}>
                    <div className={cn('flex border-b border-border/50', cfg.header)}>
                      <div
                        style={{ width: labelW, minWidth: labelW }}
                        className={cn('shrink-0 border-r border-border/40 px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest', cfg.text)}
                      >
                        {cfg.label}
                      </div>
                      <div className="flex-1" />
                    </div>

                    {catRows.map(row => (
                      <TimelineBar
                        key={row.id}
                        row={row}
                        cfg={cfg}
                        labelW={labelW}
                        height={row.depth === 0 ? rowH : childRowH}
                        markerPct={markerPct}
                        weekCount={range.weekStarts.length}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** The week column containing today, for header highlighting. */
function currentWeekStart(weekStarts: Date[]): Date {
  const now = new Date();
  for (const w of weekStarts) {
    if (now >= w && now < addDays(w, 7)) return w;
  }
  return weekStarts[0];
}

function TimelineBar({
  row,
  cfg,
  labelW,
  height,
  markerPct,
  weekCount,
}: {
  row: TimelineRow;
  cfg: (typeof CATEGORY)[TimelineCategory];
  labelW: number;
  height: number;
  markerPct: number | null;
  weekCount: number;
}) {
  const isDone = row.status === 'completed';
  const hasBar = row.widthPct > 0;

  const label = (
    <div className={cn('flex items-center gap-1.5 min-w-0', row.depth === 1 ? 'pl-6 pr-2' : 'px-3.5')}>
      {row.depth === 1 && <span className="w-1.5 h-px bg-border-strong shrink-0" />}
      <div className="min-w-0">
        <p
          className={cn(
            'truncate leading-tight font-medium text-foreground',
            row.depth === 0 ? 'text-[12px]' : 'text-[11px] text-muted-foreground',
            isDone && 'line-through text-muted-foreground'
          )}
        >
          {row.title}
        </p>
        {row.subtitle && row.depth === 0 && (
          <p className="text-[10px] text-muted-foreground truncate leading-tight">{row.subtitle}</p>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="flex border-b border-border/25 last:border-b-0 hover:bg-muted/25 transition-colors"
      style={{ height }}
    >
      <div
        style={{ width: labelW, minWidth: labelW }}
        className="shrink-0 border-r border-border/40 flex flex-col justify-center overflow-hidden"
      >
        {row.href ? (
          <Link href={row.href} className="hover:underline decoration-border-strong underline-offset-2">
            {label}
          </Link>
        ) : (
          label
        )}
      </div>

      <div className="flex-1 relative">
        {/* Week gridlines */}
        <div className="absolute inset-0 flex pointer-events-none">
          {Array.from({ length: weekCount }, (_, i) => (
            <div key={i} className="flex-1 border-r border-border/25 last:border-r-0" />
          ))}
        </div>

        {/* Today marker */}
        {markerPct !== null && (
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/60 pointer-events-none z-[1]"
            style={{ left: `${markerPct}%` }}
          />
        )}

        {/* The bar itself */}
        {hasBar && (
          <div
            className="absolute top-0 bottom-0 flex items-center z-[2]"
            style={{ left: `${row.offsetPct}%`, width: `${row.widthPct}%` }}
            title={row.title}
          >
            {row.isMilestone ? (
              <span
                className={cn(
                  'block w-2.5 h-2.5 rotate-45 rounded-[2px] mx-auto',
                  row.depth === 0 ? cfg.bar : cfg.childBar,
                  isDone && 'opacity-40'
                )}
              />
            ) : (
              <div
                className={cn(
                  'w-full',
                  row.depth === 0 ? 'h-[9px]' : 'h-[6px]',
                  row.depth === 0 ? cfg.bar : cfg.childBar,
                  isDone && 'opacity-40',
                  row.clippedStart ? 'rounded-l-none' : 'rounded-l-full',
                  row.clippedEnd ? 'rounded-r-none' : 'rounded-r-full'
                )}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
