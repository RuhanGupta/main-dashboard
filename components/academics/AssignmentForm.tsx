'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { IAssignment } from '@/types';

interface Props {
  assignment?: IAssignment;
  onSave: () => void;
  onCancel: () => void;
}

export function AssignmentForm({ assignment, onSave, onCancel }: Props) {
  const [form, setForm] = useState({
    title: assignment?.title ?? '',
    course: assignment?.course ?? '',
    startDate: assignment?.startDate ? new Date(assignment.startDate).toISOString().split('T')[0] : '',
    dueDate: assignment?.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
    priority: assignment?.priority ?? 'medium',
    status: assignment?.status ?? 'not_started',
    notes: assignment?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const method = assignment?._id ? 'PUT' : 'POST';
    const url = assignment?._id ? `/api/assignments/${assignment._id}` : '/api/assignments';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
        <Input
          required
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Assignment title"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Course *</label>
        <Input
          required
          value={form.course}
          onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
          placeholder="e.g. MATH 101, Chemistry"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Start Date</label>
          <Input
            type="date"
            value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Due Date</label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Priority</label>
          <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
          <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
        <Textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Planning notes, reminders..."
          rows={3}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? 'Saving...' : assignment ? 'Update' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
