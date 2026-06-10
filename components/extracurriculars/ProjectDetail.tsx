'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, ExternalLink, Edit2, CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { IProject } from '@/types';
import { cn, priorityColor, statusColor, formatDate, formatDateShort } from '@/lib/utils';
import { ProjectForm } from './ProjectForm';

export function ProjectDetail({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<IProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', dueDate: '', priority: 'medium' });
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);

  const fetch_ = () =>
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(setProject)
      .finally(() => setLoading(false));

  useEffect(() => { fetch_(); }, [id]);

  const updateProject = async (updates: Partial<IProject>) => {
    const body = { ...project, ...updates };
    setProject(prev => prev ? { ...prev, ...updates } : prev);
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const updated = await res.json();
    setProject(updated);
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    const tasks = [...(project?.tasks ?? []), { ...newTask, status: 'not_started', subtasks: [] }];
    await updateProject({ tasks } as any);
    setNewTask({ title: '', dueDate: '', priority: 'medium' });
    setShowTaskForm(false);
  };

  const toggleTask = async (idx: number) => {
    const tasks = [...(project?.tasks ?? [])] as any[];
    tasks[idx] = { ...tasks[idx], status: tasks[idx].status === 'completed' ? 'not_started' : 'completed' };
    await updateProject({ tasks } as any);
  };

  const deleteTask = async (idx: number) => {
    const tasks = (project?.tasks ?? []).filter((_, i) => i !== idx);
    await updateProject({ tasks } as any);
  };

  const toggleTaskVisibility = async (idx: number) => {
    const tasks = [...(project?.tasks ?? [])] as any[];
    tasks[idx] = { ...tasks[idx], counselorVisible: tasks[idx].counselorVisible === false ? true : false };
    await updateProject({ tasks } as any);
  };

  const addLink = async () => {
    if (!newLink.title.trim() || !newLink.url.trim()) return;
    const links = [...(project?.links ?? []), newLink];
    await updateProject({ links });
    setNewLink({ title: '', url: '' });
    setShowLinkForm(false);
  };

  const deleteLink = async (idx: number) => {
    const links = (project?.links ?? []).filter((_, i) => i !== idx);
    await updateProject({ links });
  };

  const deleteProject = async () => {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    router.push('/extracurriculars');
  };

  if (loading) return <div className="p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded w-64" /></div>;
  if (!project) return <div className="p-6 text-gray-500">Project not found.</div>;

  const tasks = project.tasks as any[] ?? [];
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
          {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {project.priority && <Badge className={cn(priorityColor(project.priority))}>{project.priority}</Badge>}
            {project.status && <Badge className={cn(statusColor(project.status))}>{project.status.replace('_', ' ')}</Badge>}
            {project.dueDate && <span className="text-sm text-gray-400">Due {formatDate(project.dueDate)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            title={project.counselorVisible === false ? 'Hidden from counselor' : 'Visible to counselor'}
            onClick={() => updateProject({ counselorVisible: project.counselorVisible === false ? true : false })}
            className={project.counselorVisible === false ? 'text-gray-400' : 'text-indigo-600'}
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
        <div className="bg-purple-50 rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-purple-700">Task Progress</span>
              <span className="text-purple-500">{completedCount}/{tasks.length}</span>
            </div>
            <div className="w-full bg-purple-100 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${(completedCount / tasks.length) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Notes */}
          <Card>
            <CardHeader><h3 className="font-semibold text-gray-900">Notes</h3></CardHeader>
            <CardContent>
              {project.notes ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.notes}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No notes. Click Edit to add some.</p>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Tasks</h3>
                <Button size="sm" variant="outline" onClick={() => setShowTaskForm(s => !s)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showTaskForm && (
                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                  <Input placeholder="Task title" value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={newTask.dueDate} onChange={e => setNewTask(t => ({ ...t, dueDate: e.target.value }))} />
                    <Select value={newTask.priority} onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addTask}>Add Task</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No tasks yet.</p>
                ) : (
                  tasks.map((t, idx) => {
                    const projectHidden = project.counselorVisible === false;
                    const taskHidden = t.counselorVisible === false;
                    const effectivelyHidden = projectHidden || taskHidden;
                    return (
                      <div key={idx} className={cn('flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group', effectivelyHidden && 'opacity-60')}>
                        <button onClick={() => toggleTask(idx)} className="text-gray-300 hover:text-green-500 transition-colors">
                          {t.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4" />}
                        </button>
                        <span className={cn('text-sm flex-1', t.status === 'completed' && 'line-through text-gray-400')}>{t.title}</span>
                        {t.dueDate && <span className="text-xs text-gray-400">{formatDateShort(t.dueDate)}</span>}
                        {t.priority && <Badge className={cn('text-xs', priorityColor(t.priority))}>{t.priority}</Badge>}
                        <button
                          onClick={() => !projectHidden && toggleTaskVisibility(idx)}
                          disabled={projectHidden}
                          title={projectHidden ? 'Hidden because project is hidden' : taskHidden ? 'Hidden from counselor' : 'Visible to counselor'}
                          className={cn(
                            'opacity-0 group-hover:opacity-100 transition-all',
                            projectHidden ? 'cursor-not-allowed text-gray-300' : taskHidden ? 'text-gray-400 hover:text-indigo-500' : 'text-indigo-400 hover:text-indigo-600'
                          )}
                        >
                          {effectivelyHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteTask(idx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
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
                <h3 className="font-semibold text-gray-900 text-sm">Links</h3>
                <Button size="sm" variant="outline" onClick={() => setShowLinkForm(s => !s)}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showLinkForm && (
                <div className="space-y-2 mb-3">
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
                  <p className="text-xs text-gray-400">No links yet.</p>
                ) : (
                  project.links.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline flex-1 truncate">
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        {link.title}
                      </a>
                      <button onClick={() => deleteLink(idx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
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
