'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, ExternalLink, Edit2, CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { IAssignment } from '@/types';
import { cn, priorityColor, statusColor, formatDate } from '@/lib/utils';
import { AssignmentForm } from './AssignmentForm';

export function AssignmentDetail({ id }: { id: string }) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<IAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [newSubtask, setNewSubtask] = useState({ title: '', startDate: '', dueDate: '', priority: 'medium' as const });
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [editingSubtaskIdx, setEditingSubtaskIdx] = useState<number | null>(null);
  const [editSubtask, setEditSubtask] = useState({ title: '', startDate: '', dueDate: '', priority: 'medium' as const });

  const fetch_ = () =>
    fetch(`/api/assignments/${id}`)
      .then(r => r.json())
      .then(setAssignment)
      .finally(() => setLoading(false));

  useEffect(() => { fetch_(); }, [id]);

  const updateAssignment = async (updates: Partial<IAssignment>) => {
    const body = { ...assignment, ...updates };
    setAssignment(prev => prev ? { ...prev, ...updates } : prev);
    const res = await fetch(`/api/assignments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const updated = await res.json();
    setAssignment(updated);
  };

  const addSubtask = async () => {
    if (!newSubtask.title.trim()) return;
    const subtasks = [...(assignment?.subtasks ?? []), { ...newSubtask, status: 'not_started' as const, completed: false }];
    await updateAssignment({ subtasks });
    setNewSubtask({ title: '', startDate: '', dueDate: '', priority: 'medium' });
    setShowSubtaskForm(false);
  };

  const toggleSubtask = async (idx: number) => {
    const subtasks = [...(assignment?.subtasks ?? [])];
    subtasks[idx] = { ...subtasks[idx], completed: !subtasks[idx].completed, status: !subtasks[idx].completed ? 'completed' : 'not_started' };
    await updateAssignment({ subtasks });
  };

  const deleteSubtask = async (idx: number) => {
    const subtasks = (assignment?.subtasks ?? []).filter((_, i) => i !== idx);
    await updateAssignment({ subtasks });
  };

  const startEditSubtask = (idx: number) => {
    const s = (assignment?.subtasks ?? [])[idx];
    setEditSubtask({
      title: s.title ?? '',
      startDate: s.startDate ? new Date(s.startDate as string).toISOString().split('T')[0] : '',
      dueDate: s.dueDate ? new Date(s.dueDate as string).toISOString().split('T')[0] : '',
      priority: (s.priority ?? 'medium') as any,
    });
    setEditingSubtaskIdx(idx);
  };

  const saveEditSubtask = async (idx: number) => {
    const subtasks = [...(assignment?.subtasks ?? [])];
    subtasks[idx] = { ...subtasks[idx], ...editSubtask };
    await updateAssignment({ subtasks });
    setEditingSubtaskIdx(null);
  };

  const toggleSubtaskVisibility = async (idx: number) => {
    const subtasks = [...(assignment?.subtasks ?? [])];
    subtasks[idx] = { ...subtasks[idx], counselorVisible: subtasks[idx].counselorVisible === false ? true : false };
    await updateAssignment({ subtasks });
  };

  const addLink = async () => {
    if (!newLink.title.trim() || !newLink.url.trim()) return;
    const links = [...(assignment?.links ?? []), newLink];
    await updateAssignment({ links });
    setNewLink({ title: '', url: '' });
    setShowLinkForm(false);
  };

  const deleteLink = async (idx: number) => {
    const links = (assignment?.links ?? []).filter((_, i) => i !== idx);
    await updateAssignment({ links });
  };

  const deleteAssignment = async () => {
    if (!confirm('Delete this assignment?')) return;
    await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
    router.push('/academics');
  };

  if (loading) return <div className="p-8 animate-pulse"><div className="h-8 bg-muted rounded-xl w-64" /></div>;
  if (!assignment) return <div className="p-8 text-muted-foreground">Assignment not found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto stagger">
      {/* Back */}
      <button onClick={() => router.back()} className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Back to Academics
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-serif text-[1.75rem] font-semibold text-foreground tracking-tight">{assignment.title}</h1>
          <div className="flex items-center gap-2 mt-2.5">
            <Badge className="text-sm font-medium text-academic-deep bg-academic-soft border-academic-line">{assignment.course}</Badge>
            {assignment.priority && <Badge className={cn(priorityColor(assignment.priority))}>{assignment.priority}</Badge>}
            {assignment.status && <Badge className={cn(statusColor(assignment.status))}>{assignment.status.replace('_', ' ')}</Badge>}
            {assignment.startDate && <span className="text-sm text-muted-foreground">Start {formatDate(assignment.startDate)}</span>}
            {assignment.dueDate && <span className="text-sm text-muted-foreground">Due {formatDate(assignment.dueDate)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            title={assignment.counselorVisible === false ? 'Hidden from counselor' : 'Visible to counselor'}
            onClick={() => updateAssignment({ counselorVisible: assignment.counselorVisible === false ? true : false })}
            className={assignment.counselorVisible === false ? 'text-muted-foreground' : 'text-primary-deep'}
          >
            {assignment.counselorVisible === false
              ? <><EyeOff className="w-3.5 h-3.5 mr-1" /> Hidden</>
              : <><Eye className="w-3.5 h-3.5 mr-1" /> Visible</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteAssignment}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Notes */}
          <Card>
            <CardHeader><h3 className="font-serif font-semibold text-foreground">Notes</h3></CardHeader>
            <CardContent>
              {assignment.notes ? (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{assignment.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes yet. Click Edit to add some.</p>
              )}
            </CardContent>
          </Card>

          {/* Subtasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-semibold text-foreground">Subtasks</h3>
                <Button size="sm" variant="outline" onClick={() => setShowSubtaskForm(s => !s)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showSubtaskForm && (
                <div className="bg-muted/60 border border-border rounded-2xl p-3.5 mb-3 space-y-2 animate-scale-in">
                  <Input
                    placeholder="Subtask title"
                    value={newSubtask.title}
                    onChange={e => setNewSubtask(s => ({ ...s, title: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                      <Input type="date" value={newSubtask.startDate} onChange={e => setNewSubtask(s => ({ ...s, startDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Due Date</label>
                      <Input type="date" value={newSubtask.dueDate} onChange={e => setNewSubtask(s => ({ ...s, dueDate: e.target.value }))} />
                    </div>
                  </div>
                  <Select value={newSubtask.priority} onChange={e => setNewSubtask(s => ({ ...s, priority: e.target.value as any }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addSubtask}>Add Subtask</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowSubtaskForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {(assignment.subtasks ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No subtasks yet.</p>
                ) : (
                  assignment.subtasks.map((s, idx) => {
                    const assignmentHidden = assignment.counselorVisible === false;
                    const subtaskHidden = s.counselorVisible === false;
                    const effectivelyHidden = assignmentHidden || subtaskHidden;

                    if (editingSubtaskIdx === idx) {
                      return (
                        <div key={idx} className="bg-muted/60 border border-border rounded-2xl p-3.5 space-y-2 animate-scale-in">
                          <Input
                            placeholder="Subtask title"
                            value={editSubtask.title}
                            onChange={e => setEditSubtask(es => ({ ...es, title: e.target.value }))}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                              <Input type="date" value={editSubtask.startDate} onChange={e => setEditSubtask(es => ({ ...es, startDate: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Due Date</label>
                              <Input type="date" value={editSubtask.dueDate} onChange={e => setEditSubtask(es => ({ ...es, dueDate: e.target.value }))} />
                            </div>
                          </div>
                          <Select value={editSubtask.priority} onChange={e => setEditSubtask(es => ({ ...es, priority: e.target.value as any }))}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </Select>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEditSubtask(idx)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingSubtaskIdx(null)}>Cancel</Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className={cn('flex items-center gap-2 p-2 rounded-xl hover:bg-muted/70 group transition-colors', effectivelyHidden && 'opacity-60')}>
                        <button onClick={() => toggleSubtask(idx)} className="text-border-strong hover:text-success-deep hover:scale-110 transition-all">
                          {s.completed ? <CheckCircle2 className="w-4 h-4 text-success-deep" /> : <Circle className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={cn('text-sm', s.completed && 'line-through text-muted-foreground')}>{s.title}</span>
                          {(s.startDate || s.dueDate) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {s.startDate && <span>Start {formatDate(s.startDate)}</span>}
                              {s.startDate && s.dueDate && <span className="mx-1">·</span>}
                              {s.dueDate && <span>Due {formatDate(s.dueDate)}</span>}
                            </p>
                          )}
                        </div>
                        {s.priority && <Badge className={cn('text-xs', priorityColor(s.priority))}>{s.priority}</Badge>}
                        <button onClick={() => startEditSubtask(idx)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => !assignmentHidden && toggleSubtaskVisibility(idx)}
                          disabled={assignmentHidden}
                          title={assignmentHidden ? 'Hidden because assignment is hidden' : subtaskHidden ? 'Hidden from counselor' : 'Visible to counselor'}
                          className={cn(
                            'opacity-0 group-hover:opacity-100 transition-all',
                            assignmentHidden ? 'cursor-not-allowed text-border-strong' : subtaskHidden ? 'text-muted-foreground hover:text-primary' : 'text-primary/70 hover:text-primary-deep'
                          )}
                        >
                          {effectivelyHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteSubtask(idx)} className="opacity-0 group-hover:opacity-100 text-danger/70 hover:text-danger transition-all">
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

        {/* Right column */}
        <div className="space-y-6">
          {/* Important Links */}
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
                {(assignment.links ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No links yet.</p>
                ) : (
                  assignment.links.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-primary-deep hover:underline flex-1 truncate"
                      >
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

      {/* Edit Modal */}
      <Modal open={editMode} onClose={() => setEditMode(false)} title="Edit Assignment">
        <AssignmentForm
          assignment={assignment}
          onSave={() => { setEditMode(false); fetch_(); }}
          onCancel={() => setEditMode(false)}
        />
      </Modal>
    </div>
  );
}
