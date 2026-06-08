'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, ExternalLink, Edit2, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { IAssignment, ISubtask, ILink } from '@/types';
import { cn, priorityColor, statusColor, formatDate } from '@/lib/utils';
import { AssignmentForm } from './AssignmentForm';

export function AssignmentDetail({ id }: { id: string }) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<IAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [newSubtask, setNewSubtask] = useState({ title: '', dueDate: '', priority: 'medium' as const });
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);

  const fetch_ = () =>
    fetch(`/api/assignments/${id}`)
      .then(r => r.json())
      .then(setAssignment)
      .finally(() => setLoading(false));

  useEffect(() => { fetch_(); }, [id]);

  const updateAssignment = async (updates: Partial<IAssignment>) => {
    await fetch(`/api/assignments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...assignment, ...updates }),
    });
    fetch_();
  };

  const addSubtask = async () => {
    if (!newSubtask.title.trim()) return;
    const subtasks = [...(assignment?.subtasks ?? []), { ...newSubtask, status: 'not_started' as const, completed: false }];
    await updateAssignment({ subtasks });
    setNewSubtask({ title: '', dueDate: '', priority: 'medium' });
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

  if (loading) return <div className="p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded w-64" /></div>;
  if (!assignment) return <div className="p-6 text-gray-500">Assignment not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Academics
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="text-sm font-medium text-blue-600 bg-blue-50 border-blue-200">{assignment.course}</Badge>
            {assignment.priority && <Badge className={cn(priorityColor(assignment.priority))}>{assignment.priority}</Badge>}
            {assignment.status && <Badge className={cn(statusColor(assignment.status))}>{assignment.status.replace('_', ' ')}</Badge>}
            {assignment.dueDate && <span className="text-sm text-gray-400">Due {formatDate(assignment.dueDate)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
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
            <CardHeader><h3 className="font-semibold text-gray-900">Notes</h3></CardHeader>
            <CardContent>
              {assignment.notes ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.notes}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No notes yet. Click Edit to add some.</p>
              )}
            </CardContent>
          </Card>

          {/* Subtasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Subtasks</h3>
                <Button size="sm" variant="outline" onClick={() => setShowSubtaskForm(s => !s)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showSubtaskForm && (
                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                  <Input
                    placeholder="Subtask title"
                    value={newSubtask.title}
                    onChange={e => setNewSubtask(s => ({ ...s, title: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={newSubtask.dueDate}
                      onChange={e => setNewSubtask(s => ({ ...s, dueDate: e.target.value }))}
                    />
                    <Select value={newSubtask.priority} onChange={e => setNewSubtask(s => ({ ...s, priority: e.target.value as any }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addSubtask}>Add Subtask</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowSubtaskForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {(assignment.subtasks ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No subtasks yet.</p>
                ) : (
                  assignment.subtasks.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group">
                      <button onClick={() => toggleSubtask(idx)} className="text-gray-300 hover:text-green-500 transition-colors">
                        {s.completed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4" />}
                      </button>
                      <span className={cn('text-sm flex-1', s.completed && 'line-through text-gray-400')}>{s.title}</span>
                      {s.dueDate && <span className="text-xs text-gray-400">{formatDate(s.dueDate)}</span>}
                      <button onClick={() => deleteSubtask(idx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
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
                {(assignment.links ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400">No links yet.</p>
                ) : (
                  assignment.links.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline flex-1 truncate"
                      >
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
