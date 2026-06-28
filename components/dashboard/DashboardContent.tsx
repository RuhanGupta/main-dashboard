'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { BookOpen, Star, Dumbbell, CheckCircle2, Clock, Feather, ArrowRight, ListTodo } from 'lucide-react';
import Link from 'next/link';
import { IAssignment, IAcademicRecurringTask } from '@/types';
import { WeeklyCalendar } from './WeeklyCalendar';
import { TaskItem } from './TaskItem';
import { DailyFocusPanel } from './DailyFocusPanel';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface DashboardData {
  assignments: IAssignment[];
  projectTasks: Array<{ _id: string; title: string; dueDate?: string; projectTitle?: string; priority?: string; status?: string }>;
  workouts: Array<{ _id: string; title: string; date: string; exercises?: unknown[]; completed?: boolean }>;
  academicRecurringTasks: IAcademicRecurringTask[];
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

  const { assignments, projectTasks, workouts, academicRecurringTasks, windowStart, windowEnd } = data;

  const subtasksInWindow = assignments.flatMap(a =>
    (a.subtasks ?? []).filter(s => s.dueDate).map(s => ({ ...s, parentTitle: a.title, parentType: 'assignment' }))
  );

  const totalItems = assignments.length + projectTasks.length + subtasksInWindow.length;
  const completedItems = [
    ...assignments.filter(a => a.status === 'completed'),
    ...projectTasks.filter(t => t.status === 'completed'),
    ...subtasksInWindow.filter(s => s.completed),
  ].length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6 stagger max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[2rem] leading-tight font-semibold text-foreground tracking-tight">
            Good {getGreeting()}, <span className="italic text-primary">let&apos;s get to work</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
            <span className="text-muted-foreground/50"> · </span>
            tasks from {format(new Date(windowStart), 'MMM d')} – {format(new Date(windowEnd), 'MMM d')}
          </p>
        </div>
        {totalItems > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-2.5 shadow-card backdrop-blur-sm">
            <div className="relative w-11 h-11">
              <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-muted)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${(progressPct / 100) * 97.4} 97.4`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-foreground tabular-nums">{progressPct}%</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">{completedItems} of {totalItems} done</p>
              <p className="text-xs text-muted-foreground">this week</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tasks This Week" value={totalItems} icon={<ListTodo className="w-[18px] h-[18px] text-primary" />} accent="from-primary/15" />
        <StatCard label="Completed" value={completedItems} icon={<CheckCircle2 className="w-[18px] h-[18px] text-body-deep" />} accent="from-body/15" />
        <StatCard label="Assignments" value={assignments.length} icon={<BookOpen className="w-[18px] h-[18px] text-academic-deep" />} accent="from-academic/15" />
        <StatCard label="Projects" value={projectTasks.length} icon={<Star className="w-[18px] h-[18px] text-extracurricular-deep" />} accent="from-extracurricular/15" />
      </div>

      {/* Daily Focus */}
      <DailyFocusPanel />

      {/* Weekly Calendar */}
      <WeeklyCalendar
        assignments={assignments}
        projectTasks={projectTasks}
        workouts={workouts}
        academicRecurringTasks={academicRecurringTasks}
      />

      {/* Task lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="bg-card/70 backdrop-blur-sm">
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
                <TaskItem key={a._id} title={a.title} subtitle={a.course} dueDate={a.dueDate} priority={a.priority} status={a.status} href={`/academics/${a._id}`} />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur-sm">
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
                <TaskItem key={t._id} title={t.title} subtitle={t.projectTitle} dueDate={t.dueDate} priority={t.priority} status={t.status} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Domain quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: '/academics', label: 'Academics', icon: BookOpen, color: 'text-academic-deep bg-academic-soft border-academic-line' },
          { href: '/extracurriculars', label: 'Extracurriculars', icon: Star, color: 'text-extracurricular-deep bg-extracurricular-soft border-extracurricular-line' },
          { href: '/body', label: 'Body', icon: Dumbbell, color: 'text-body-deep bg-body-soft border-body-line' },
          { href: '/reflection', label: 'Reflection', icon: Feather, color: 'text-reflection-deep bg-reflection-soft border-reflection-line' },
        ].map(({ href, label, icon: Icon, color }) => (
          <Link key={href} href={href} className={`group flex items-center justify-between p-4 rounded-2xl border font-medium text-sm lift ${color}`}>
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {label}
            </div>
            <ArrowRight className="w-4 h-4 opacity-50 transition-transform duration-200 group-hover:translate-x-1 group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: string }) {
  return (
    <div className={`relative overflow-hidden bg-card/70 rounded-2xl p-4 border border-border shadow-card lift backdrop-blur-sm bg-gradient-to-br ${accent} to-transparent`}>
      <div className="flex items-center justify-between mb-2">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-card/80 border border-border/60">
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
    <div className="space-y-6 animate-pulse max-w-6xl">
      <div className="h-9 bg-muted rounded-xl w-72" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-2xl" />)}
      </div>
      <div className="h-24 bg-muted rounded-2xl" />
      <div className="h-80 bg-muted rounded-3xl" />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
