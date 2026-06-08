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
    urgent: 'text-red-500 bg-red-50 border-red-200',
    high: 'text-orange-500 bg-orange-50 border-orange-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-green-600 bg-green-50 border-green-200',
  };
  return colors[priority] ?? 'text-gray-500 bg-gray-50 border-gray-200';
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'text-green-600 bg-green-50 border-green-200',
    in_progress: 'text-blue-600 bg-blue-50 border-blue-200',
    not_started: 'text-gray-500 bg-gray-50 border-gray-200',
    cancelled: 'text-red-400 bg-red-50 border-red-200',
  };
  return colors[status] ?? 'text-gray-500 bg-gray-50 border-gray-200';
}

export function domainColor(domain: string): string {
  const colors: Record<string, string> = {
    academic: 'text-blue-600 bg-blue-50 border-blue-200',
    extracurricular: 'text-purple-600 bg-purple-50 border-purple-200',
    body: 'text-green-600 bg-green-50 border-green-200',
    reflection: 'text-amber-600 bg-amber-50 border-amber-200',
  };
  return colors[domain] ?? 'text-gray-500 bg-gray-50 border-gray-200';
}
