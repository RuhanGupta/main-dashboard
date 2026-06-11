'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { BookOpen, Star, Dumbbell, CheckCircle2, Clock, Feather, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { IAssignment, IProject } from '@/types';
import { WeeklyCalendar } from './WeeklyCalendar';
import { TaskItem } from './TaskItem';
import { DailyFocusPanel } from './DailyFocusPanel';
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
  if (!data) return <p className="text-muted-foreground">Failed to load dashboard.</p>;

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
    <div className="space-y-6 stagger">
      {/* Header */}
      <div>
        <h1 className="font-serif text-[2rem] leading-tight font-semibold text-foreground tracking-tight">
          Good {getGreeting()}, <span className="italic text-primary">let&apos;s get to work</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1.5">
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
          icon={<Clock className="w-[18px] h-[18px] text-primary" />}
          chip="bg-secondary/60"
        />
        <StatCard
          label="Completed"
          value={completedItems}
          icon={<CheckCircle2 className="w-[18px] h-[18px] text-body-deep" />}
          chip="bg-body-soft"
        />
        <StatCard
          label="Assignments"
          value={assignments.length}
          icon={<BookOpen className="w-[18px] h-[18px] text-academic-deep" />}
          chip="bg-academic-soft"
        />
        <StatCard
          label="Projects"
          value={projectTasks.length}
          icon={<Star className="w-[18px] h-[18px] text-extracurricular-deep" />}
          chip="bg-extracurricular-soft"
        />
      </div>

      {/* Progress bar */}
      {totalItems > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Weekly Progress</span>
              <span className="text-sm font-semibold text-primary">{progressPct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="progress-gradient h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{completedItems} of {totalItems} tasks completed</p>
          </CardContent>
        </Card>
      )}

      {/* Weekly Calendar */}
      <WeeklyCalendar assignments={assignments} projectTasks={projectTasks} workouts={workouts} />

      {/* Domain quick links */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href: '/academics', label: 'Academics', icon: BookOpen, color: 'text-academic-deep bg-academic-soft border-academic-line' },
          { href: '/extracurriculars', label: 'Extracurriculars', icon: Star, color: 'text-extracurricular-deep bg-extracurricular-soft border-extracurricular-line' },
          { href: '/body', label: 'Body', icon: Dumbbell, color: 'text-body-deep bg-body-soft border-body-line' },
          { href: '/reflection', label: 'Reflection', icon: Feather, color: 'text-reflection-deep bg-reflection-soft border-reflection-line' },
        ].map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className={`group flex items-center justify-between p-4 rounded-2xl border font-medium text-sm lift ${color}`}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {label}
            </div>
            <ArrowRight className="w-4 h-4 opacity-50 transition-transform duration-200 group-hover:translate-x-1 group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      {/* Task lists */}
      <div className="grid grid-cols-2 gap-6">
        {/* Assignments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-academic-soft flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-academic-deep" />
                </span>
                <h3 className="font-semibold text-foreground text-sm">Assignments</h3>
              </div>
              <Link href="/academics" className="text-xs font-medium text-primary hover:text-primary-deep transition-colors">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No assignments due this week 🎉</p>
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
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-extracurricular-soft flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-extracurricular-deep" />
                </span>
                <h3 className="font-semibold text-foreground text-sm">Extracurricular Tasks</h3>
              </div>
              <Link href="/extracurriculars" className="text-xs font-medium text-primary hover:text-primary-deep transition-colors">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {projectTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No tasks due this week 🎉</p>
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

function StatCard({ label, value, icon, chip }: { label: string; value: number; icon: React.ReactNode; chip: string }) {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-card lift">
      <div className="flex items-center justify-between mb-2">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${chip}`}>
          {icon}
        </span>
        <span className="text-[1.7rem] font-serif font-semibold text-foreground tabular-nums">{value}</span>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded-xl w-64" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-2xl" />)}
      </div>
      <div className="h-48 bg-muted rounded-2xl" />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
