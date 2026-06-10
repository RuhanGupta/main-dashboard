'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { BookOpen, Star, Dumbbell, CheckCircle2, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { IAssignment, IProject } from '@/types';
import { WeeklyCalendar } from './WeeklyCalendar';
import { TaskItem } from './TaskItem';
import { DailyFocusPanel } from './DailyFocusPanel';
import { Badge } from '@/components/ui/badge';
import { priorityColor, statusColor, formatDateShort } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface DashboardData {
  assignments: IAssignment[];
  projectTasks: Array<{ _id: string; title: string; dueDate?: string; projectTitle?: string; priority?: string; status?: string }>;
  workouts: Array<{ _id: string; title: string; date: string }>;
  windowStart: string;
  windowEnd: string;
}

export function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <p className="text-gray-500">Failed to load dashboard.</p>;

  const { assignments, projectTasks, workouts, windowStart, windowEnd } = data;

  // Gather all subtasks in window
  const subtasksInWindow = assignments.flatMap(a =>
    (a.subtasks ?? []).filter(s => s.dueDate).map(s => ({
      ...s,
      parentTitle: a.title,
      parentType: 'assignment',
    }))
  );

  const totalItems = assignments.length + projectTasks.length + subtasksInWindow.length;
  const completedItems = [
    ...assignments.filter(a => a.status === 'completed'),
    ...projectTasks.filter(t => t.status === 'completed'),
    ...subtasksInWindow.filter(s => s.completed),
  ].length;

  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good {getGreeting()}, let's get to work 👋</h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} · Showing tasks from{' '}
          {format(new Date(windowStart), 'MMM d')} – {format(new Date(windowEnd), 'MMM d')}
        </p>
      </div>

      {/* Daily Focus */}
      <DailyFocusPanel />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Tasks This Week"
          value={totalItems}
          icon={<Clock className="w-5 h-5 text-indigo-500" />}
          color="bg-indigo-50"
        />
        <StatCard
          label="Completed"
          value={completedItems}
          icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
          color="bg-green-50"
        />
        <StatCard
          label="Assignments"
          value={assignments.length}
          icon={<BookOpen className="w-5 h-5 text-blue-500" />}
          color="bg-blue-50"
        />
        <StatCard
          label="Projects"
          value={projectTasks.length}
          icon={<Star className="w-5 h-5 text-purple-500" />}
          color="bg-purple-50"
        />
      </div>

      {/* Progress bar */}
      {totalItems > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Weekly Progress</span>
              <span className="text-sm font-semibold text-indigo-600">{progressPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{completedItems} of {totalItems} tasks completed</p>
          </CardContent>
        </Card>
      )}

      {/* Weekly Calendar */}
      <WeeklyCalendar assignments={assignments} projectTasks={projectTasks} workouts={workouts} />

      {/* Domain quick links */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href: '/academics', label: 'Academics', icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { href: '/extracurriculars', label: 'Extracurriculars', icon: Star, color: 'text-purple-600 bg-purple-50 border-purple-200' },
          { href: '/body', label: 'Body', icon: Dumbbell, color: 'text-green-600 bg-green-50 border-green-200' },
          { href: '/reflection', label: 'Reflection', icon: AlertCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
        ].map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-between p-4 rounded-xl border font-medium text-sm transition-all hover:shadow-sm ${color}`}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {label}
            </div>
            <ChevronRight className="w-4 h-4 opacity-60" />
          </Link>
        ))}
      </div>

      {/* Task lists */}
      <div className="grid grid-cols-2 gap-6">
        {/* Assignments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Assignments</h3>
              </div>
              <Link href="/academics" className="text-xs text-indigo-600 hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No assignments due this week 🎉</p>
            ) : (
              assignments.slice(0, 6).map(a => (
                <TaskItem
                  key={a._id}
                  title={a.title}
                  subtitle={a.course}
                  dueDate={a.dueDate}
                  priority={a.priority}
                  status={a.status}
                  href={`/academics/${a._id}`}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Project Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Extracurricular Tasks</h3>
              </div>
              <Link href="/extracurriculars" className="text-xs text-indigo-600 hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {projectTasks.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No tasks due this week 🎉</p>
            ) : (
              projectTasks.slice(0, 6).map(t => (
                <TaskItem
                  key={t._id}
                  title={t.title}
                  subtitle={t.projectTitle}
                  dueDate={t.dueDate}
                  priority={t.priority}
                  status={t.status}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`${color} rounded-xl p-4 border border-white/60`}>
      <div className="flex items-center justify-between mb-1">
        {icon}
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-xs font-medium text-gray-600">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-64" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-48 bg-gray-200 rounded-xl" />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
