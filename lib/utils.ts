import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRollingWindowDates() {
  const today = new Date();
  const start = subDays(startOfDay(today), 2);
  const end = addDays(endOfDay(today), 4);
  return { start, end };
}

export function isInRollingWindow(date: Date | string | undefined): boolean {
  if (!date) return false;
  const { start, end } = getRollingWindowDates();
  const d = new Date(date);
  return d >= start && d <= end;
}

export function getWeekDates(referenceDate: Date = new Date()): Date[] {
  const today = referenceDate;
  const dayOfWeek = today.getDay();
  const startOfWeek = subDays(today, dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek, i));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function priorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: 'text-danger-deep bg-danger-soft border-danger-line',
    high: 'text-warning-deep bg-warning-soft border-warning-line',
    medium: 'text-info-deep bg-info-soft border-info-line',
    low: 'text-success-deep bg-success-soft border-success-line',
  };
  return colors[priority] ?? 'text-muted-foreground bg-muted border-border';
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'text-success-deep bg-success-soft border-success-line',
    in_progress: 'text-info-deep bg-info-soft border-info-line',
    not_started: 'text-muted-foreground bg-muted border-border',
    cancelled: 'text-danger-deep bg-danger-soft border-danger-line',
  };
  return colors[status] ?? 'text-muted-foreground bg-muted border-border';
}

export function domainColor(domain: string): string {
  const colors: Record<string, string> = {
    academic: 'text-academic-deep bg-academic-soft border-academic-line',
    extracurricular: 'text-extracurricular-deep bg-extracurricular-soft border-extracurricular-line',
    body: 'text-body-deep bg-body-soft border-body-line',
    reflection: 'text-reflection-deep bg-reflection-soft border-reflection-line',
  };
  return colors[domain] ?? 'text-muted-foreground bg-muted border-border';
}
