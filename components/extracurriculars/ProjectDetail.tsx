'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, ExternalLink, Edit2, CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { IProject, Priority } from '@/types';
import { createObjectIdString } from '@/lib/client-ids';
import { persistQueuedInBackground } from '@/lib/client-requests';
import { cn, priorityColor, statusColor, formatDate, formatDateShort } from '@/lib/utils';
import { ProjectForm } from './ProjectForm';

type ProjectTask = IProject['tasks'][number] & {
  startDate?: Date | string;
};
type TaskDraft = {
  title: string;
  startDate: string;
  dueDate: string;
  priority: Priority;
};

const emptyTaskDraft = (): TaskDraft => ({ title: '', startDate: '', dueDate: '', priority: 'medium' });

export function ProjectDetail({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<IProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [newTask, setNewTask] = useState<TaskDraft>(emptyTaskDraft);
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [editingTaskIdx, setEditingTaskIdx] = useState<number | null>(null);
  const [editTask, setEditTask] = useState<TaskDraft>(emptyTaskDraft);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());

  const fetch_ = () =>
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(setProject)
      .finally(() => setLoading(false));

  useEffect(() => { fetch_(); }, [id]);

  const updateProject = (updates: Partial<IProject> | ((current: IProject) => Partial<IProject>)) => {
    setProject(current => {
      if (!current) return current;
      const patch = typeof updates === 'function' ? updates(current) : updates;
      const next = { ...current, ...patch };

      persistQueuedInBackground(
        saveQueue,
        'project-update',
        () => fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        }),
        () => { void fetch_(); }
      );

      return next;
    });
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const task: ProjectTask = {
      ...newTask,
      _id: createObjectIdString(),
      domain: 'extracurricular',
      status: 'not_started',
      subtasks: [],
    };
    setNewTask(emptyTaskDraft());
    setShowTaskForm(false);
    updateProject(current => ({ tasks: [...(current.tasks ?? []), task] }));
  };

  const toggleTask = (idx: number) => {
    updateProject(current => {
      const tasks = [...(current.tasks ?? [])];
      tasks[idx] = { ...tasks[idx], status: tasks[idx].status === 'completed' ? 'not_started' : 'completed' };
      return { tasks };
    });
  };

  const deleteTask = (idx: number) => {
    updateProject(current => ({ tasks: (current.tasks ?? []).filter((_, i) => i !== idx) }));
  };

  const startEditTask = (idx: number) => {
    const t = ((project?.tasks ?? []) as ProjectTask[])[idx];
    setEditTask({
      title: t.title ?? '',
      startDate: t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : '',
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '',
      priority: t.priority ?? 'medium',
    });
    setEditingTaskIdx(idx);
  };

  const saveEditTask = (idx: number) => {
    setEditingTaskIdx(null);
    updateProject(current => {
      const tasks = [...((current.tasks ?? []) as ProjectTask[])];
      tasks[idx] = { ...tasks[idx], ...editTask };
      return { tasks };
    });
  };

  const toggleTaskVisibility = (idx: number) => {
    updateProject(current => {
      const tasks = [...(current.tasks ?? [])];
      tasks[idx] = { ...tasks[idx], counselorVisible: tasks[idx].counselorVisible === false ? true : false };
      return { tasks };
    });
  };

  const addLink = () => {
    if (!newLink.title.trim() || !newLink.url.trim()) return;
    const link = newLink;
    setNewLink({ title: '', url: '' });
    setShowLinkForm(false);
    updateProject(current => ({ links: [...(current.links ?? []), link] }));
  };

  const deleteLink = (idx: number) => {
    updateProject(current => ({ links: (current.links ?? []).filter((_, i) => i !== idx) }));
  };

  const deleteProject = async () => {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    router.push('/extracurriculars');
  };

  if (loading) return <div className="p-8 animate-pulse"><div className="h-8 bg-muted rounded-xl w-64" /></div>;
  if (!project) return <div className="p-8 text-muted-foreground">Project not found.</div>;

  const tasks = (project.tasks ?? []) as ProjectTask[];
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="p-8 max-w-4xl mx-auto stagger">
      <button onClick={() => router.back()} className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Back
      </button>

      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-serif text-[1.75rem] font-semibold text-foreground tracking-tight">{project.title}</h1>
          {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {project.priority && <Badge className={cn(priorityColor(project.priority))}>{project.priority}</Badge>}
            {project.status && <Badge className={cn(statusColor(project.status))}>{project.status.replace('_', ' ')}</Badge>}
            {project.startDate && <span className="text-sm text-muted-foreground">Start {formatDate(project.startDate)}</span>}
            {project.dueDate && <span className="text-sm text-muted-foreground">Due {formatDate(project.dueDate)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            title={project.counselorVisible === false ? 'Hidden from counselor' : 'Visible to counselor'}
            onClick={() => updateProject({ counselorVisible: project.counselorVisible === false ? true : false })}
            className={project.counselorVisible === false ? 'text-muted-foreground' : 'text-primary-deep'}
          >
            {project.counselorVisible === false
              ? <><EyeOff className="w-3.5 h-3.5 mr-1" /> Hidden</>
              : <><Eye className="w-3.5 h-3.5 mr-1" /> Visible</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}><Edit2 className="w-3.5 h-3.5 mr-1" />Edit</Button>
          <Button variant="destructive" size="sm" onClick={deleteProject}><Trash2 className="w-3.5 h-3.5 mr-1" />Delete</Button>
        </div>
      </div>

      {/* Progress */}
      {tasks.length > 0 && (
        <div className="bg-extracurricular-soft border border-extracurricular-line rounded-2xl p-4 mb-7 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-extracurricular-deep">Task Progress</span>
              <span className="text-extracurricular-deep/70 tabular-nums">{completedCount}/{tasks.length}</span>
            </div>
            <div className="w-full bg-card/70 rounded-full h-2 overflow-hidden">
              <div className="bg-extracurricular h-2 rounded-full transition-all duration-500" style={{ width: `${(completedCount / tasks.length) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Notes */}
          <Card>
            <CardHeader><h3 className="font-serif font-semibold text-foreground">Notes</h3></CardHeader>
            <CardContent>
              {project.notes ? (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{project.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes. Click Edit to add some.</p>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-semibold text-foreground">Tasks</h3>
                <Button size="sm" variant="outline" onClick={() => setShowTaskForm(s => !s)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showTaskForm && (
                <div className="bg-muted/60 border border-border rounded-2xl p-3.5 mb-3 space-y-2 animate-scale-in">
                  <Input placeholder="Task title" value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                      <Input type="date" value={newTask.startDate} onChange={e => setNewTask(t => ({ ...t, startDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Due Date</label>
                      <Input type="date" value={newTask.dueDate} onChange={e => setNewTask(t => ({ ...t, dueDate: e.target.value }))} />
                    </div>
                  </div>
                  <Select value={newTask.priority} onChange={e => setNewTask(t => ({ ...t, priority: e.target.value as Priority }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addTask}>Add Task</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No tasks yet.</p>
                ) : (
                  tasks.map((t, idx) => {
                    const projectHidden = project.counselorVisible === false;
                    const taskHidden = t.counselorVisible === false;
                    const effectivelyHidden = projectHidden || taskHidden;

                    if (editingTaskIdx === idx) {
                      return (
                        <div key={idx} className="bg-muted/60 border border-border rounded-2xl p-3.5 space-y-2 animate-scale-in">
                          <Input
                            placeholder="Task title"
                            value={editTask.title}
                            onChange={e => setEditTask(et => ({ ...et, title: e.target.value }))}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                              <Input type="date" value={editTask.startDate} onChange={e => setEditTask(et => ({ ...et, startDate: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Due Date</label>
                              <Input type="date" value={editTask.dueDate} onChange={e => setEditTask(et => ({ ...et, dueDate: e.target.value }))} />
                            </div>
                          </div>
                          <Select value={editTask.priority} onChange={e => setEditTask(et => ({ ...et, priority: e.target.value as Priority }))}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </Select>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEditTask(idx)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingTaskIdx(null)}>Cancel</Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className={cn('flex items-center gap-2 p-2 rounded-xl hover:bg-muted/70 group transition-colors', effectivelyHidden && 'opacity-60')}>
                        <button onClick={() => toggleTask(idx)} className="text-border-strong hover:text-success-deep hover:scale-110 transition-all">
                          {t.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-success-deep" /> : <Circle className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={cn('text-sm', t.status === 'completed' && 'line-through text-muted-foreground')}>{t.title}</span>
                          {(t.startDate || t.dueDate) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t.startDate && <span>Start {formatDateShort(t.startDate)}</span>}
                              {t.startDate && t.dueDate && <span className="mx-1">·</span>}
                              {t.dueDate && <span>Due {formatDateShort(t.dueDate)}</span>}
                            </p>
                          )}
                        </div>
                        {t.priority && <Badge className={cn('text-xs', priorityColor(t.priority))}>{t.priority}</Badge>}
                        <button onClick={() => startEditTask(idx)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => !projectHidden && toggleTaskVisibility(idx)}
                          disabled={projectHidden}
                          title={projectHidden ? 'Hidden because project is hidden' : taskHidden ? 'Hidden from counselor' : 'Visible to counselor'}
                          className={cn(
                            'opacity-0 group-hover:opacity-100 transition-all',
                            projectHidden ? 'cursor-not-allowed text-border-strong' : taskHidden ? 'text-muted-foreground hover:text-primary' : 'text-primary/70 hover:text-primary-deep'
                          )}
                        >
                          {effectivelyHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteTask(idx)} className="opacity-0 group-hover:opacity-100 text-danger/70 hover:text-danger transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right col */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-semibold text-foreground text-sm">Links</h3>
                <Button size="sm" variant="outline" onClick={() => setShowLinkForm(s => !s)}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showLinkForm && (
                <div className="space-y-2 mb-3 animate-scale-in">
                  <Input placeholder="Link title" value={newLink.title} onChange={e => setNewLink(l => ({ ...l, title: e.target.value }))} />
                  <Input placeholder="URL" type="url" value={newLink.url} onChange={e => setNewLink(l => ({ ...l, url: e.target.value }))} />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={addLink}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowLinkForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {(project.links ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No links yet.</p>
                ) : (
                  project.links.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary-deep hover:underline flex-1 truncate">
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        {link.title}
                      </a>
                      <button onClick={() => deleteLink(idx)} className="opacity-0 group-hover:opacity-100 text-danger/70 hover:text-danger transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={editMode} onClose={() => setEditMode(false)} title="Edit Project">
        <ProjectForm project={project} onSave={() => { setEditMode(false); fetch_(); }} onCancel={() => setEditMode(false)} />
      </Modal>
    </div>
  );
}
