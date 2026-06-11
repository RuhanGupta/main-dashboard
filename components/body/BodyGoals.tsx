'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { cn, statusColor, formatDateShort } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface BodyGoal {
  _id?: string;
  title: string;
  notes?: string;
  status: string;
  dueDate?: string;
  subtasks: Array<{ title: string; completed: boolean; dueDate?: string; notes?: string }>;
}

export function BodyGoals() {
  const [goals, setGoals] = useState<BodyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', notes: '', status: 'not_started', dueDate: '' });

  const fetchGoals = async () => {
    const res = await fetch('/api/body-goals');
    const data = await res.json();
    setGoals(data);
  };

  useEffect(() => { fetchGoals().finally(() => setLoading(false)); }, []);

  const createGoal = async () => {
    if (!form.title.trim()) return;
    const res = await fetch('/api/body-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, subtasks: [] }),
    });
    const created = await res.json();
    setGoals(prev => [...prev, created]);
    setForm({ title: '', notes: '', status: 'not_started', dueDate: '' });
    setShowForm(false);
  };

  const addSubtask = async (goal: BodyGoal, title: string) => {
    const subtasks = [...goal.subtasks, { title, completed: false }];
    const body = { ...goal, subtasks };
    setGoals(prev => prev.map(g => g._id === goal._id ? { ...g, subtasks } : g));
    const res = await fetch(`/api/body-goals/${goal._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const updated = await res.json();
    setGoals(prev => prev.map(g => g._id === goal._id ? updated : g));
  };

  const toggleSubtask = async (goal: BodyGoal, idx: number) => {
    const subtasks = [...goal.subtasks];
    subtasks[idx] = { ...subtasks[idx], completed: !subtasks[idx].completed };
    const body = { ...goal, subtasks };
    setGoals(prev => prev.map(g => g._id === goal._id ? { ...g, subtasks } : g));
    const res = await fetch(`/api/body-goals/${goal._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const updated = await res.json();
    setGoals(prev => prev.map(g => g._id === goal._id ? updated : g));
  };

  const deleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g._id !== id));
    await fetch(`/api/body-goals/${id}`, { method: 'DELETE' });
  };

  if (loading) return <div className="animate-pulse space-y-3">{[1,2].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif font-semibold text-foreground text-lg">Summer Goals</h2>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card className="p-14 text-center">
          <Target className="w-12 h-12 text-border-strong mx-auto mb-3" />
          <p className="text-foreground font-serif font-medium text-lg">No goals yet</p>
          <p className="text-sm text-muted-foreground mt-1">Set your summer fitness goals</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => (
            <GoalCard key={goal._id} goal={goal} onAddSubtask={addSubtask} onToggleSubtask={toggleSubtask} onDelete={deleteGoal} />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Goal">
        <div className="space-y-3">
          <Input placeholder="Goal title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea placeholder="Notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={createGoal}>Create Goal</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function GoalCard({ goal, onAddSubtask, onToggleSubtask, onDelete }: {
  goal: BodyGoal;
  onAddSubtask: (g: BodyGoal, title: string) => void;
  onToggleSubtask: (g: BodyGoal, idx: number) => void;
  onDelete: (id: string) => void;
}) {
  const [newSubtask, setNewSubtask] = useState('');
  const completed = goal.subtasks.filter(s => s.completed).length;
  const total = goal.subtasks.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-serif font-semibold text-foreground">{goal.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn('text-xs', statusColor(goal.status))}>{goal.status.replace('_', ' ')}</Badge>
              {goal.dueDate && <span className="text-xs text-muted-foreground">Due {formatDateShort(goal.dueDate)}</span>}
            </div>
          </div>
          <button onClick={() => onDelete(goal._id!)} className="text-border-strong hover:text-danger transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {goal.notes && <p className="text-sm text-muted-foreground mt-2">{goal.notes}</p>}
        {total > 0 && (
          <div className="mt-2.5">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{completed}/{total} tasks</span>
              <span>{Math.round((completed / total) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-body h-1.5 rounded-full transition-all duration-500" style={{ width: `${(completed / total) * 100}%` }} />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 mb-3">
          {goal.subtasks.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <button onClick={() => onToggleSubtask(goal, idx)} className="text-border-strong hover:text-success-deep hover:scale-110 transition-all">
                {s.completed ? <CheckCircle2 className="w-4 h-4 text-success-deep" /> : <Circle className="w-4 h-4" />}
              </button>
              <span className={cn('text-sm flex-1', s.completed && 'line-through text-muted-foreground')}>{s.title}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add task..."
            value={newSubtask}
            onChange={e => setNewSubtask(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newSubtask.trim()) { onAddSubtask(goal, newSubtask); setNewSubtask(''); } }}
            className="text-sm"
          />
          <Button size="sm" variant="outline" onClick={() => { if (newSubtask.trim()) { onAddSubtask(goal, newSubtask); setNewSubtask(''); } }}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
