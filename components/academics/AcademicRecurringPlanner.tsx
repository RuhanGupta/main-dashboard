'use client';
import { useEffect, useState } from 'react';
import { format, addDays, subDays, startOfDay, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2, CheckCircle2, Circle, CircleDot, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { IAcademicRecurringTask, AcademicTaskStatus } from '@/types';
import { cn } from '@/lib/utils';

const SUBJECTS = ['Chinese', 'English', 'Reflection', 'Other'];

const STATUS_META: Record<AcademicTaskStatus, { label: string; dot: string; chip: string }> = {
  not_started: { label: 'Not started', dot: 'text-muted-foreground', chip: 'bg-muted text-muted-foreground border-border' },
  in_progress: { label: 'In progress', dot: 'text-academic-deep', chip: 'bg-academic-soft text-academic-deep border-academic-line' },
  completed: { label: 'Completed', dot: 'text-success-deep', chip: 'bg-success-soft text-success-deep border-success-line' },
};

const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');

function statusForDate(task: IAcademicRecurringTask, key: string): AcademicTaskStatus {
  return task.completionLog?.find(r => r.date === key)?.status ?? 'not_started';
}

function currentStreak(task: IAcademicRecurringTask): number {
  const completed = (task.completionLog ?? [])
    .filter(r => r.status === 'completed')
    .map(r => r.date)
    .sort()
    .reverse();
  // Count consecutive completed weekly occurrences from the most recent backwards.
  let streak = 0;
  let expected: Date | null = null;
  for (const d of completed) {
    const date = new Date(`${d}T00:00:00`);
    if (expected === null) {
      streak = 1;
      expected = subDays(date, 7);
    } else if (isSameDay(date, expected)) {
      streak += 1;
      expected = subDays(date, 7);
    } else {
      break;
    }
  }
  return streak;
}

export function AcademicRecurringPlanner() {
  const [tasks, setTasks] = useState<IAcademicRecurringTask[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [addDay, setAddDay] = useState<Date | null>(null);
  const [detail, setDetail] = useState<{ task: IAcademicRecurringTask; day: Date } | null>(null);

  const today = new Date();
  const referenceDate = addDays(today, weekOffset * 7);
  const weekStart = subDays(startOfDay(referenceDate), referenceDate.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchTasks = async () => {
    const res = await fetch('/api/academic-recurring-tasks');
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetchTasks(); }, []);

  const tasksForDay = (day: Date) =>
    tasks
      .filter(t => t.active && t.dayOfWeek === day.getDay())
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));

  const createTask = async (fields: Record<string, unknown>) => {
    await fetch('/api/academic-recurring-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    setAddDay(null);
    fetchTasks();
  };

  const updateTask = async (id: string, fields: Partial<IAcademicRecurringTask>) => {
    await fetch(`/api/academic-recurring-tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    await fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await fetch(`/api/academic-recurring-tasks/${id}`, { method: 'DELETE' });
    setDetail(null);
    fetchTasks();
  };

  const setOccurrenceStatus = async (id: string, date: string, status: AcademicTaskStatus) => {
    const res = await fetch(`/api/academic-recurring-tasks/${id}/completion`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, status }),
    });
    const updated = await res.json();
    setTasks(prev => prev.map(t => (t._id === id ? updated : t)));
    setDetail(prev => (prev && prev.task._id === id ? { ...prev, task: updated } : prev));
  };

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">
          {format(days[0], 'MMM d')} – {format(days[6], 'MMM d, yyyy')}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setWeekOffset(0)} className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-academic-soft text-academic-deep hover:bg-academic-line/60 transition-colors">
            Today
          </button>
          <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 7-column calendar */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const dayTasks = tasksForDay(day);
          const key = dateKey(day);
          return (
            <div key={i} className={cn('rounded-2xl border overflow-hidden bg-card shadow-card transition-colors', isToday ? 'border-academic ring-1 ring-academic/30' : 'border-border')}>
              <div className={cn('px-2 py-2.5 text-center', isToday ? 'bg-academic-soft' : 'bg-muted/50')}>
                <p className={cn('text-[10px] uppercase tracking-[0.15em]', isToday ? 'text-academic-deep font-semibold' : 'text-muted-foreground')}>{format(day, 'EEE')}</p>
                <p className={cn('text-lg font-serif font-semibold mt-0.5', isToday ? 'text-academic-deep' : 'text-foreground')}>{format(day, 'd')}</p>
              </div>
              <div className="p-1.5 space-y-1 min-h-[100px]">
                {dayTasks.map(t => {
                  const status = statusForDate(t, key);
                  return (
                    <div
                      key={t._id}
                      className={cn(
                        'px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-200 hover:scale-[1.03] border',
                        status === 'completed' ? 'bg-success-soft text-success-deep border-success-line' : 'bg-academic-soft/60 text-academic-deep border-academic-line hover:bg-academic-soft'
                      )}
                      onClick={() => setDetail({ task: t, day })}
                    >
                      <span className="font-medium block truncate">{t.title}</span>
                      {t.startTime && <p className="opacity-70 mt-0.5">{t.startTime}{t.endTime ? `–${t.endTime}` : ''}</p>}
                    </div>
                  );
                })}
                <button
                  onClick={() => setAddDay(day)}
                  className="w-full text-center text-xs text-muted-foreground/50 hover:text-academic-deep py-1 transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {addDay && (
        <AddTaskModal
          day={addDay}
          onClose={() => setAddDay(null)}
          onCreate={createTask}
        />
      )}

      {detail && (
        <TaskDetailModal
          task={tasks.find(t => t._id === detail.task._id) ?? detail.task}
          day={detail.day}
          onClose={() => setDetail(null)}
          onSetStatus={setOccurrenceStatus}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}

function AddTaskModal({ day, onClose, onCreate }: {
  day: Date;
  onClose: () => void;
  onCreate: (fields: Record<string, unknown>) => void;
}) {
  const [subject, setSubject] = useState('Chinese');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<AcademicTaskStatus>('not_started');
  const [notes, setNotes] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    const completionLog = status !== 'not_started'
      ? [{ date: dateKey(day), status, completedAt: status === 'completed' ? new Date().toISOString() : undefined }]
      : [];
    onCreate({
      title: title.trim(),
      subject,
      dayOfWeek: day.getDay(),
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      notes: notes.trim() || undefined,
      active: true,
      completionLog,
    });
  };

  return (
    <Modal open onClose={onClose} title={`Add Recurring Task – Every ${format(day, 'EEEE')}`}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Subject</label>
          <Select value={subject} onChange={e => setSubject(e.target.value)}>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Task title <span className="text-danger">*</span></label>
          <Input
            placeholder="e.g. Chinese speaking practice"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Start time</label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">End time</label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Status for {format(day, 'MMM d')}</label>
          <Select value={status} onChange={e => setStatus(e.target.value as AcademicTaskStatus)}>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (optional)</label>
          <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything to remember..." />
        </div>
        <div className="flex gap-2 pt-1">
          <Button className="flex-1" onClick={submit} disabled={!title.trim()}>Create Task</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">Repeats every {format(day, 'EEEE')} until deleted.</p>
      </div>
    </Modal>
  );
}

function TaskDetailModal({ task, day, onClose, onSetStatus, onUpdate, onDelete }: {
  task: IAcademicRecurringTask;
  day: Date;
  onClose: () => void;
  onSetStatus: (id: string, date: string, status: AcademicTaskStatus) => void;
  onUpdate: (id: string, fields: Partial<IAcademicRecurringTask>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    subject: task.subject,
    title: task.title,
    startTime: task.startTime ?? '',
    endTime: task.endTime ?? '',
    notes: task.notes ?? '',
  });

  const key = dateKey(day);
  const status = statusForDate(task, key);
  const streak = currentStreak(task);
  const recent = [...(task.completionLog ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  const saveEdits = () => {
    onUpdate(task._id!, {
      subject: form.subject,
      title: form.title,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      notes: form.notes || undefined,
    });
    setEditing(false);
  };

  return (
    <Modal open onClose={onClose} title={task.title} className="max-w-md">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-academic-soft text-academic-deep border border-academic-line">{task.subject}</span>
            <p className="text-sm text-muted-foreground mt-1.5">
              Every {format(day, 'EEEE')}
              {task.startTime && ` · ${task.startTime}${task.endTime ? `–${task.endTime}` : ''}`}
            </p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-sm font-semibold text-academic-deep">
              <Flame className="w-4 h-4" /> {streak}
            </div>
          )}
        </div>

        {/* Status for selected date */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Status for {format(day, 'EEE, MMM d')}</p>
          <div className="grid grid-cols-3 gap-2">
            {(['not_started', 'in_progress', 'completed'] as AcademicTaskStatus[]).map(s => {
              const Icon = s === 'completed' ? CheckCircle2 : s === 'in_progress' ? CircleDot : Circle;
              const active = status === s;
              return (
                <button
                  key={s}
                  onClick={() => onSetStatus(task._id!, key, s)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95',
                    active ? STATUS_META[s].chip : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {STATUS_META[s].label}
                </button>
              );
            })}
          </div>
        </div>

        {task.notes && !editing && (
          <p className="text-sm text-muted-foreground bg-muted/40 border border-border rounded-xl px-3 py-2">{task.notes}</p>
        )}

        {/* Completion history */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Recent history</p>
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">No history yet.</p>
          ) : (
            <div className="space-y-1">
              {recent.map(r => (
                <div key={r.date} className="flex items-center justify-between text-xs bg-muted/50 border border-border/60 rounded-lg px-3 py-1.5">
                  <span className="text-muted-foreground">{format(new Date(`${r.date}T00:00:00`), 'EEE, MMM d')}</span>
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border', STATUS_META[r.status].chip)}>{STATUS_META[r.status].label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit form */}
        {editing ? (
          <div className="bg-muted/50 border border-border rounded-2xl p-3.5 space-y-2.5 animate-scale-in">
            <Select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
            <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdits}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => setEditing(true)} className="text-xs font-medium text-academic-deep hover:underline">Edit task</button>
            <div className="flex items-center gap-3">
              <button onClick={() => onUpdate(task._id!, { active: false })} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Deactivate</button>
              <button onClick={() => onDelete(task._id!)} className="flex items-center gap-1 text-xs text-danger/80 hover:text-danger transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
