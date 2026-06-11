import { notFound } from 'next/navigation';
import { GraduationCap, BookOpen, Star, CheckCircle2, Circle, Clock } from 'lucide-react';
import { connectToDatabase } from '@/lib/mongodb';
import { CounselorShare } from '@/models/CounselorShare';
import { Assignment } from '@/models/Assignment';
import { Project } from '@/models/Project';

interface Subtask {
  _id: string;
  title: string;
  completed: boolean;
  status: string;
  dueDate?: string;
}

interface Assignment {
  _id: string;
  title: string;
  course: string;
  status: string;
  priority: string;
  dueDate?: string;
  subtasks: Subtask[];
}

interface Task {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
}

interface Project {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  tasks: Task[];
}

function statusLabel(s: string) {
  return s === 'not_started' ? 'Not Started' : s === 'in_progress' ? 'In Progress' : s === 'completed' ? 'Completed' : 'Cancelled';
}

function statusBadgeClass(s: string) {
  if (s === 'completed') return 'bg-success-soft text-success-deep border border-success-line';
  if (s === 'in_progress') return 'bg-info-soft text-info-deep border border-info-line';
  if (s === 'cancelled') return 'bg-muted text-muted-foreground border border-border';
  return 'bg-warning-soft text-warning-deep border border-warning-line';
}

function priorityBadgeClass(p: string) {
  if (p === 'urgent') return 'bg-danger-soft text-danger-deep border border-danger-line';
  if (p === 'high') return 'bg-warning-soft text-warning-deep border border-warning-line';
  if (p === 'medium') return 'bg-info-soft text-info-deep border border-info-line';
  return 'bg-muted text-muted-foreground border border-border';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function getData(token: string): Promise<{ assignments: Assignment[]; projects: Project[] } | null> {
  await connectToDatabase();

  const share = await CounselorShare.findOne({ token }).lean() as { userId: string } | null;
  if (!share) return null;

  const [rawAssignments, rawProjects] = await Promise.all([
    Assignment.find({ userId: share.userId, counselorVisible: { $ne: false } }).sort({ dueDate: 1 }).lean(),
    Project.find({ userId: share.userId, counselorVisible: { $ne: false } }).sort({ dueDate: 1 }).lean(),
  ]);

  const assignments = (rawAssignments as any[]).map(a => ({
    ...a,
    _id: String(a._id),
    subtasks: (a.subtasks ?? [])
      .filter((s: any) => s.counselorVisible !== false)
      .map((s: any) => ({ ...s, _id: String(s._id) })),
  }));

  const projects = (rawProjects as any[]).map(p => ({
    ...p,
    _id: String(p._id),
    tasks: (p.tasks ?? [])
      .filter((t: any) => t.counselorVisible !== false)
      .map((t: any) => ({ ...t, _id: String(t._id) })),
  }));

  return { assignments, projects };
}

export default async function CounselorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getData(token);
  if (!data) notFound();

  const { assignments, projects } = data;

  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === 'completed').length;

  const allTasks = projects.flatMap(p => p.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;

  const grouped = assignments.reduce((acc, a) => {
    if (!acc[a.course]) acc[a.course] = [];
    acc[a.course].push(a);
    return acc;
  }, {} as Record<string, Assignment[]>);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-card/70 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-semibold text-foreground tracking-tight">Student Progress Report</h1>
            <p className="text-xs text-muted-foreground">Counselor view — read only</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-academic-deep" />
              <span className="text-sm font-semibold text-foreground">Assignments</span>
            </div>
            <p className="text-3xl font-serif font-semibold text-foreground">{completedAssignments}<span className="text-lg text-muted-foreground font-normal">/{totalAssignments}</span></p>
            <p className="text-xs text-muted-foreground mt-1">completed</p>
            {totalAssignments > 0 && (
              <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-academic h-1.5 rounded-full transition-all" style={{ width: `${(completedAssignments / totalAssignments) * 100}%` }} />
              </div>
            )}
          </div>
          <div className="bg-card rounded-2xl border border-border p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-extracurricular-deep" />
              <span className="text-sm font-semibold text-foreground">Project Tasks</span>
            </div>
            <p className="text-3xl font-serif font-semibold text-foreground">{completedTasks}<span className="text-lg text-muted-foreground font-normal">/{totalTasks}</span></p>
            <p className="text-xs text-muted-foreground mt-1">completed</p>
            {totalTasks > 0 && (
              <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-extracurricular h-1.5 rounded-full transition-all" style={{ width: `${(completedTasks / totalTasks) * 100}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Academics */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-academic-deep" />
            <h2 className="font-serif text-lg font-semibold text-foreground">Academics</h2>
          </div>
          {totalAssignments === 0 ? (
            <p className="text-sm text-muted-foreground italic">No assignments shared.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([course, items]) => (
                <div key={course}>
                  <h3 className="text-xs font-semibold text-academic-deep uppercase tracking-[0.18em] mb-3">{course}</h3>
                  <div className="space-y-3">
                    {items.map(a => (
                      <div key={a._id} className="bg-card rounded-2xl border border-border p-4 shadow-card">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {a.status === 'completed'
                              ? <CheckCircle2 className="w-4 h-4 text-success-deep flex-shrink-0" />
                              : <Circle className="w-4 h-4 text-border-strong flex-shrink-0" />}
                            <span className={`text-sm font-medium truncate ${a.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {a.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusBadgeClass(a.status)}`}>{statusLabel(a.status)}</span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${priorityBadgeClass(a.priority)}`}>{a.priority}</span>
                          </div>
                        </div>
                        {a.dueDate && (
                          <div className="flex items-center gap-1.5 mt-2 ml-6">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Due {formatDate(a.dueDate)}</span>
                          </div>
                        )}
                        {a.subtasks.length > 0 && (
                          <div className="mt-3 ml-6 space-y-1.5 border-t border-border/60 pt-3">
                            {a.subtasks.map((s, idx) => (
                              <div key={s._id ?? idx} className="flex items-center gap-2">
                                {s.completed
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                                  : <Circle className="w-3.5 h-3.5 text-border-strong flex-shrink-0" />}
                                <span className={`text-xs ${s.completed ? 'line-through text-muted-foreground' : 'text-foreground/80'}`}>{s.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Extracurriculars */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-extracurricular-deep" />
            <h2 className="font-serif text-lg font-semibold text-foreground">Extracurriculars</h2>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No projects shared.</p>
          ) : (
            <div className="space-y-4">
              {projects.map(p => {
                const done = p.tasks.filter(t => t.status === 'completed').length;
                return (
                  <div key={p._id} className="bg-card rounded-2xl border border-border p-4 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-medium ${p.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{p.title}</p>
                        {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusBadgeClass(p.status)}`}>{statusLabel(p.status)}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${priorityBadgeClass(p.priority)}`}>{p.priority}</span>
                      </div>
                    </div>
                    {p.dueDate && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Due {formatDate(p.dueDate)}</span>
                      </div>
                    )}
                    {p.tasks.length > 0 && (
                      <div className="mt-3 border-t border-border/60 pt-3">
                        <p className="text-xs text-muted-foreground mb-2">{done}/{p.tasks.length} tasks completed</p>
                        <div className="w-full bg-muted rounded-full h-1.5 mb-3 overflow-hidden">
                          <div className="bg-extracurricular h-1.5 rounded-full" style={{ width: `${(done / p.tasks.length) * 100}%` }} />
                        </div>
                        <div className="space-y-1.5">
                          {p.tasks.map((t, idx) => (
                            <div key={t._id ?? idx} className="flex items-center gap-2">
                              {t.status === 'completed'
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                                : <Circle className="w-3.5 h-3.5 text-border-strong flex-shrink-0" />}
                              <span className={`text-xs ${t.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground/80'}`}>{t.title}</span>
                              {t.dueDate && <span className="text-xs text-muted-foreground ml-auto">{formatDate(t.dueDate)}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground pb-4">
          This is a read-only view shared by the student. Content is filtered to what they chose to share.
        </p>
      </main>
    </div>
  );
}
