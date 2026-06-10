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
  if (s === 'completed') return 'bg-green-100 text-green-700';
  if (s === 'in_progress') return 'bg-blue-100 text-blue-700';
  if (s === 'cancelled') return 'bg-gray-100 text-gray-500';
  return 'bg-yellow-100 text-yellow-700';
}

function priorityBadgeClass(p: string) {
  if (p === 'urgent') return 'bg-red-100 text-red-700';
  if (p === 'high') return 'bg-orange-100 text-orange-700';
  if (p === 'medium') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-500';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function getData(token: string): Promise<{ assignments: Assignment[]; projects: Project[] } | null> {
  await connectToDatabase();

  const share = await CounselorShare.findOne({ token }).lean() as { userId: string } | null;
  if (!share) return null;

  const [rawAssignments, rawProjects] = await Promise.all([
    Assignment.find({ userId: share.userId, counselorVisible: true }).sort({ dueDate: 1 }).lean(),
    Project.find({ userId: share.userId, counselorVisible: true }).sort({ dueDate: 1 }).lean(),
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Student Progress Report</h1>
            <p className="text-xs text-gray-500">Counselor view — read only</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-700">Assignments</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{completedAssignments}<span className="text-lg text-gray-400 font-normal">/{totalAssignments}</span></p>
            <p className="text-xs text-gray-500 mt-1">completed</p>
            {totalAssignments > 0 && (
              <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${(completedAssignments / totalAssignments) * 100}%` }} />
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-gray-700">Project Tasks</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{completedTasks}<span className="text-lg text-gray-400 font-normal">/{totalTasks}</span></p>
            <p className="text-xs text-gray-500 mt-1">completed</p>
            {totalTasks > 0 && (
              <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${(completedTasks / totalTasks) * 100}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Academics */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Academics</h2>
          </div>
          {totalAssignments === 0 ? (
            <p className="text-sm text-gray-400 italic">No assignments shared.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([course, items]) => (
                <div key={course}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{course}</h3>
                  <div className="space-y-3">
                    {items.map(a => (
                      <div key={a._id} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {a.status === 'completed'
                              ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                            <span className={`text-sm font-medium truncate ${a.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {a.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(a.status)}`}>{statusLabel(a.status)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadgeClass(a.priority)}`}>{a.priority}</span>
                          </div>
                        </div>
                        {a.dueDate && (
                          <div className="flex items-center gap-1.5 mt-2 ml-6">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-400">Due {formatDate(a.dueDate)}</span>
                          </div>
                        )}
                        {a.subtasks.length > 0 && (
                          <div className="mt-3 ml-6 space-y-1.5 border-t border-gray-100 pt-3">
                            {a.subtasks.map((s, idx) => (
                              <div key={s._id ?? idx} className="flex items-center gap-2">
                                {s.completed
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                                  : <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                                <span className={`text-xs ${s.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>{s.title}</span>
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
            <Star className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Extracurriculars</h2>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No projects shared.</p>
          ) : (
            <div className="space-y-4">
              {projects.map(p => {
                const done = p.tasks.filter(t => t.status === 'completed').length;
                return (
                  <div key={p._id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-medium ${p.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{p.title}</p>
                        {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(p.status)}`}>{statusLabel(p.status)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadgeClass(p.priority)}`}>{p.priority}</span>
                      </div>
                    </div>
                    {p.dueDate && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">Due {formatDate(p.dueDate)}</span>
                      </div>
                    )}
                    {p.tasks.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <p className="text-xs text-gray-500 mb-2">{done}/{p.tasks.length} tasks completed</p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                          <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(done / p.tasks.length) * 100}%` }} />
                        </div>
                        <div className="space-y-1.5">
                          {p.tasks.map((t, idx) => (
                            <div key={t._id ?? idx} className="flex items-center gap-2">
                              {t.status === 'completed'
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                                : <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                              <span className={`text-xs ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-600'}`}>{t.title}</span>
                              {t.dueDate && <span className="text-xs text-gray-400 ml-auto">{formatDate(t.dueDate)}</span>}
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

        <p className="text-center text-xs text-gray-400 pb-4">
          This is a read-only view shared by the student. Content is filtered to what they chose to share.
        </p>
      </main>
    </div>
  );
}
