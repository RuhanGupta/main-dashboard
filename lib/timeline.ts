import { addDays, addWeeks, differenceInCalendarDays, startOfDay, startOfWeek, subWeeks } from 'date-fns';
import type { IAssignment, IProject, ISubtask, ITask } from '@/types';

/**
 * Pure layout logic for the lookahead timeline. Kept free of React and of any
 * data fetching so the date maths can be exercised directly.
 */

export type TimelineCategory = 'academic' | 'project' | 'fitness';

export interface IBodyGoalLike {
  _id?: string;
  title: string;
  status?: string;
  dueDate?: Date | string;
  subtasks?: Array<{ _id?: string; title: string; dueDate?: Date | string; status?: string }>;
}

export type TimelineRange = {
  start: Date;
  end: Date;
  /** Total days covered, inclusive of both ends. */
  totalDays: number;
  /** Sunday of each week in the range, for column headers. */
  weekStarts: Date[];
};

export type TimelineRow = {
  id: string;
  title: string;
  subtitle?: string;
  category: TimelineCategory;
  /** 0 = parent item, 1 = subtask/task nested under it. */
  depth: 0 | 1;
  status: string;
  /** Offset of the bar from the range start, as a 0–100 percentage. */
  offsetPct: number;
  /** Bar width as a 0–100 percentage of the range. */
  widthPct: number;
  /** True when the item has a single date rather than a span. */
  isMilestone: boolean;
  /** The item extends beyond the visible range on that side. */
  clippedStart: boolean;
  clippedEnd: boolean;
  href?: string;
};

/**
 * The visible window: whole weeks, starting `weeksBefore` weeks before the
 * current week and running `weeksAfter` weeks past it. The defaults give six
 * columns — last week, this week, and the next four.
 */
export function buildTimelineRange(
  weeksBefore = 1,
  weeksAfter = 4,
  from: Date = new Date()
): TimelineRange {
  const start = startOfWeek(subWeeks(startOfDay(from), weeksBefore), { weekStartsOn: 0 });
  const end = addDays(startOfWeek(addWeeks(startOfDay(from), weeksAfter), { weekStartsOn: 0 }), 6);
  const totalDays = differenceInCalendarDays(end, start) + 1;

  const weekStarts: Date[] = [];
  for (let d = new Date(start); d <= end; d = addWeeks(d, 1)) {
    weekStarts.push(new Date(d));
  }

  return { start, end, totalDays, weekStarts };
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Position one item within the range, clipping to the visible window.
 * Returns null when the item falls entirely outside it, or has no dates.
 */
function position(
  rawStart: Date | string | null | undefined,
  rawEnd: Date | string | null | undefined,
  range: TimelineRange
): Pick<TimelineRow, 'offsetPct' | 'widthPct' | 'isMilestone' | 'clippedStart' | 'clippedEnd'> | null {
  const sd = toDate(rawStart);
  const ed = toDate(rawEnd);
  if (!sd && !ed) return null;

  // A single date renders as a milestone marker occupying one day.
  const isMilestone = !sd || !ed;
  const from = startOfDay(sd ?? ed!);
  const to = startOfDay(ed ?? sd!);

  // Guard against an end date before the start date.
  const realFrom = from <= to ? from : to;
  const realTo = from <= to ? to : from;

  if (realTo < range.start || realFrom > range.end) return null;

  const clippedStart = realFrom < range.start;
  const clippedEnd = realTo > range.end;

  const visibleFrom = clippedStart ? range.start : realFrom;
  const visibleTo = clippedEnd ? range.end : realTo;

  const startOffset = differenceInCalendarDays(visibleFrom, range.start);
  const spanDays = differenceInCalendarDays(visibleTo, visibleFrom) + 1;

  return {
    offsetPct: (startOffset / range.totalDays) * 100,
    widthPct: (spanDays / range.totalDays) * 100,
    isMilestone,
    clippedStart,
    clippedEnd,
  };
}

function makeRow(
  base: Omit<TimelineRow, 'offsetPct' | 'widthPct' | 'isMilestone' | 'clippedStart' | 'clippedEnd'>,
  rawStart: Date | string | null | undefined,
  rawEnd: Date | string | null | undefined,
  range: TimelineRange
): TimelineRow | null {
  const pos = position(rawStart, rawEnd, range);
  return pos ? { ...base, ...pos } : null;
}

export type TimelineInput = {
  assignments?: IAssignment[];
  projects?: IProject[];
  bodyGoals?: IBodyGoalLike[];
};

/**
 * Flatten assignments, projects and body goals into positioned rows. A parent
 * is included whenever it or any of its children fall in range, so a subtask
 * never appears orphaned from its heading.
 */
export function buildTimelineRows(input: TimelineInput, range: TimelineRange): TimelineRow[] {
  const rows: TimelineRow[] = [];

  for (const a of input.assignments ?? []) {
    const id = String(a._id);
    const children: TimelineRow[] = [];

    for (const [i, s] of ((a.subtasks ?? []) as ISubtask[]).entries()) {
      const child = makeRow(
        {
          id: `${id}-sub-${s._id ?? i}`,
          title: s.title,
          category: 'academic',
          depth: 1,
          status: s.completed ? 'completed' : (s.status ?? 'not_started'),
          href: `/academics/${id}`,
        },
        s.startDate,
        s.dueDate,
        range
      );
      if (child) children.push(child);
    }

    const parent = makeRow(
      {
        id,
        title: a.title,
        subtitle: a.course,
        category: 'academic',
        depth: 0,
        status: a.status ?? 'not_started',
        href: `/academics/${id}`,
      },
      a.startDate,
      a.dueDate,
      range
    );

    if (parent) rows.push(parent);
    else if (children.length > 0) {
      // Parent is out of range but its subtasks aren't — show a heading anyway.
      rows.push({
        id, title: a.title, subtitle: a.course, category: 'academic', depth: 0,
        status: a.status ?? 'not_started', href: `/academics/${id}`,
        offsetPct: 0, widthPct: 0, isMilestone: false, clippedStart: false, clippedEnd: false,
      });
    }
    rows.push(...children);
  }

  for (const p of input.projects ?? []) {
    const id = String(p._id);
    const children: TimelineRow[] = [];

    for (const [i, t] of ((p.tasks ?? []) as ITask[]).entries()) {
      const child = makeRow(
        {
          id: `${id}-task-${t._id ?? i}`,
          title: t.title,
          category: 'project',
          depth: 1,
          status: t.status ?? 'not_started',
          href: `/extracurriculars/${id}`,
        },
        (t as ITask & { startDate?: Date | string }).startDate,
        t.dueDate,
        range
      );
      if (child) children.push(child);
    }

    const parent = makeRow(
      {
        id,
        title: p.title,
        category: 'project',
        depth: 0,
        status: p.status ?? 'not_started',
        href: `/extracurriculars/${id}`,
      },
      p.startDate,
      p.dueDate,
      range
    );

    if (parent) rows.push(parent);
    else if (children.length > 0) {
      rows.push({
        id, title: p.title, category: 'project', depth: 0,
        status: p.status ?? 'not_started', href: `/extracurriculars/${id}`,
        offsetPct: 0, widthPct: 0, isMilestone: false, clippedStart: false, clippedEnd: false,
      });
    }
    rows.push(...children);
  }

  for (const g of input.bodyGoals ?? []) {
    const id = String(g._id);
    const parent = makeRow(
      { id, title: g.title, category: 'fitness', depth: 0, status: g.status ?? 'not_started', href: '/body' },
      null,
      g.dueDate,
      range
    );
    if (parent) rows.push(parent);

    for (const [i, s] of (g.subtasks ?? []).entries()) {
      const child = makeRow(
        {
          id: `${id}-sub-${s._id ?? i}`,
          title: s.title,
          category: 'fitness',
          depth: 1,
          status: s.status ?? 'not_started',
          href: '/body',
        },
        null,
        s.dueDate,
        range
      );
      if (child) rows.push(child);
    }
  }

  return rows;
}

/** Where "now" sits in the range, as a 0–100 percentage. */
export function todayOffsetPct(range: TimelineRange, now: Date = new Date()): number | null {
  const today = startOfDay(now);
  if (today < range.start || today > range.end) return null;
  // Position the marker mid-day so it reads as "during today".
  return ((differenceInCalendarDays(today, range.start) + 0.5) / range.totalDays) * 100;
}

export function groupByCategory(rows: TimelineRow[]): Array<{ category: TimelineCategory; rows: TimelineRow[] }> {
  const order: TimelineCategory[] = ['academic', 'project', 'fitness'];
  return order
    .map(category => ({ category, rows: rows.filter(r => r.category === category) }))
    .filter(group => group.rows.length > 0);
}
