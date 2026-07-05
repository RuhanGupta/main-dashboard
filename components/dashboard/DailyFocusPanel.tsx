'use client';
import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Circle, X, Sparkles, BookOpen, Star, Dumbbell, Edit2, Check, ListPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createObjectIdString } from '@/lib/client-ids';
import { persistInBackground } from '@/lib/client-requests';
import type { IDailyFocusItem } from '@/types';
import { TaskPickerModal } from './TaskPickerModal';

const SOURCE_ICON: Record<string, React.ReactNode> = {
  assignment_subtask: <BookOpen className="w-3 h-3 text-academic" />,
  project_task:       <Star className="w-3 h-3 text-extracurricular" />,
  body_goal_subtask:  <Dumbbell className="w-3 h-3 text-body" />,
  quick_task:         <ListPlus className="w-3 h-3 text-sidebar-muted" />,
};

function sortItems(items: IDailyFocusItem[]): IDailyFocusItem[] {
  return [...items].sort((a, b) => {
    // Completed items always go last
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    // Within same completion group: sort by startDate ascending, then dueDate, then addedAt
    const aDate = a.startDate ?? a.dueDate ?? a.addedAt;
    const bDate = b.startDate ?? b.dueDate ?? b.addedAt;
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });
}

function formatDateInput(val: string | null | undefined): string {
  if (!val) return '';
  try { return new Date(val).toISOString().split('T')[0]; } catch { return ''; }
}

function formatDateDisplay(val: string | null | undefined): string {
  if (!val) return '';
  try {
    return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export function DailyFocusPanel() {
  const [items, setItems]           = useState<IDailyFocusItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editDates, setEditDates]   = useState({ startDate: '', dueDate: '' });
  const [quickTitle, setQuickTitle] = useState('');
  const [adding, setAdding]         = useState(false);

  const fetchItems = async () => {
    const res = await fetch('/api/daily-focus');
    const data = await res.json();
    setItems(data.items ?? []);
  };

  useEffect(() => { fetchItems().finally(() => setLoading(false)); }, []);

  const toggle = (item: IDailyFocusItem) => {
    const next = !item.completed;
    setItems(prev => sortItems(prev.map(i => i._id === item._id ? { ...i, completed: next } : i)));
    persistInBackground(
      'daily-focus-toggle',
      () => fetch(`/api/daily-focus/${item._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: next }),
      }),
      () => setItems(prev => sortItems(prev.map(i => i._id === item._id ? item : i)))
    );
  };

  const remove = (item: IDailyFocusItem) => {
    setItems(prev => prev.filter(i => i._id !== item._id));
    persistInBackground(
      'daily-focus-remove',
      () => fetch(`/api/daily-focus/${item._id}`, { method: 'DELETE' }),
      () => setItems(prev => sortItems([...prev, item]))
    );
  };

  const addItem = (newItem: Omit<IDailyFocusItem, '_id' | 'addedAt' | 'completed'>) => {
    const id = createObjectIdString();
    const optimistic: IDailyFocusItem = {
      ...newItem,
      _id: id,
      sourceId: newItem.sourceId || id,
      completed: false,
      addedAt: new Date().toISOString(),
    };

    setItems(prev => sortItems([...prev, optimistic]));
    persistInBackground(
      'daily-focus-add',
      () => fetch('/api/daily-focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimistic),
      }),
      () => setItems(prev => prev.filter(i => i._id !== id))
    );
  };

  const addQuickTask = () => {
    const title = quickTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    setQuickTitle('');
    addItem({
      sourceType: 'quick_task',
      sourceId: '',
      parentId: '',
      title,
      parentTitle: '',
    });
    setAdding(false);
  };

  const startEdit = (item: IDailyFocusItem) => {
    setEditingId(item._id);
    setEditDates({
      startDate: formatDateInput(item.startDate),
      dueDate: formatDateInput(item.dueDate),
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (item: IDailyFocusItem) => {
    const updated = {
      ...item,
      startDate: editDates.startDate || null,
      dueDate: editDates.dueDate || null,
    };
    setItems(prev => sortItems(prev.map(i => i._id === item._id ? updated : i)));
    setEditingId(null);
    persistInBackground(
      'daily-focus-edit',
      () => fetch(`/api/daily-focus/${item._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: editDates.startDate || null, dueDate: editDates.dueDate || null }),
      }),
      () => setItems(prev => sortItems(prev.map(i => i._id === item._id ? item : i)))
    );
  };

  const done  = items.filter(i => i.completed).length;
  const total = items.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  if (loading) {
    return <div className="h-28 bg-muted rounded-3xl animate-pulse" />;
  }

  const sorted = sortItems(items);

  return (
    <>
      {/* Dark "ink" hero panel — the centerpiece of the dashboard */}
      <div className="relative overflow-hidden bg-sidebar text-sidebar-foreground rounded-3xl p-6 shadow-lift">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-20 -right-12 w-64 h-64 rounded-full bg-sidebar-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 w-64 h-64 rounded-full bg-extracurricular/15 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-sidebar-primary to-extracurricular flex items-center justify-center shadow-glow">
              <Sparkles className="w-4 h-4 text-sidebar" />
            </span>
            <h2 className="font-serif text-lg font-semibold text-white">Today&apos;s Focus</h2>
            {total > 0 && (
              <span className="text-xs text-sidebar-muted ml-1">
                {done}/{total} done
              </span>
            )}
          </div>
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3.5 py-2 rounded-xl transition-all duration-200 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tasks
          </button>
        </div>

        {/* Quick add */}
        <div className="relative flex items-center gap-2 mb-4">
          <input
            type="text"
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addQuickTask(); }}
            placeholder="Quick add a task for today..."
            className="flex-1 text-sm bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2 text-white placeholder:text-sidebar-muted focus:outline-none focus:border-white/25 transition-colors"
          />
          <button
            onClick={addQuickTask}
            disabled={!quickTitle.trim() || adding}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white transition-all duration-200 active:scale-95"
            title="Add task"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="relative mb-4">
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full progress-gradient transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        {total === 0 ? (
          <div className="relative text-center py-5">
            <p className="text-sm text-sidebar-muted">No tasks picked yet for today.</p>
            <button
              onClick={() => setShowPicker(true)}
              className="mt-2 text-sm text-sidebar-primary hover:text-white font-medium transition-colors"
            >
              Pick your first task →
            </button>
          </div>
        ) : (
          <div className="relative space-y-1">
            {sorted.map(item => {
              if (editingId === item._id) {
                return (
                  <div key={item._id} className="bg-white/[0.08] border border-white/10 rounded-xl px-2.5 py-2.5 space-y-2 animate-scale-in">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-sidebar-muted mb-1">Start Date</label>
                        <input
                          type="date"
                          value={editDates.startDate}
                          onChange={e => setEditDates(d => ({ ...d, startDate: e.target.value }))}
                          className="w-full text-xs bg-white/10 border border-white/15 rounded-lg px-2 py-1.5 text-white [color-scheme:dark] focus:outline-none focus:border-white/30"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-sidebar-muted mb-1">Due Date</label>
                        <input
                          type="date"
                          value={editDates.dueDate}
                          onChange={e => setEditDates(d => ({ ...d, dueDate: e.target.value }))}
                          className="w-full text-xs bg-white/10 border border-white/15 rounded-lg px-2 py-1.5 text-white [color-scheme:dark] focus:outline-none focus:border-white/30"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(item)}
                        className="flex items-center gap-1 text-xs font-medium bg-sidebar-primary/80 hover:bg-sidebar-primary text-white px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-sidebar-muted hover:text-white px-2 py-1 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item._id}
                  className={cn(
                    'flex items-center gap-3 px-2.5 py-2 rounded-xl group transition-all duration-200',
                    item.completed ? 'opacity-45' : 'hover:bg-white/[0.06]'
                  )}
                >
                  <button
                    onClick={() => toggle(item)}
                    className="flex-shrink-0 text-sidebar-muted hover:text-sidebar-primary transition-colors"
                  >
                    {item.completed
                      ? <CheckCircle2 className="w-4 h-4 text-body animate-pop" />
                      : <Circle className="w-4 h-4" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate text-white', item.completed && 'line-through text-sidebar-muted')}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {item.parentTitle && (
                        <>
                          {SOURCE_ICON[item.sourceType]}
                          <span className="text-xs text-sidebar-muted truncate">{item.parentTitle}</span>
                        </>
                      )}
                      {(item.startDate || item.dueDate) && (
                        <span className="text-[10px] text-sidebar-muted/70">
                          {item.startDate && <span>{formatDateDisplay(item.startDate)}</span>}
                          {item.startDate && item.dueDate && <span className="mx-0.5">→</span>}
                          {item.dueDate && <span>{formatDateDisplay(item.dueDate)}</span>}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => startEdit(item)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-sidebar-muted hover:text-white transition-all"
                    title="Edit dates"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => remove(item)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-sidebar-muted hover:text-destructive transition-all"
                    title="Remove from today's focus"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Clear completed link */}
        {done > 0 && (
          <button
            onClick={() => items.filter(i => i.completed).forEach(remove)}
            className="relative mt-3 text-xs text-sidebar-muted hover:text-white transition-colors"
          >
            Clear {done} completed
          </button>
        )}
      </div>

      <TaskPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        existingItems={items}
        onAdd={addItem}
      />
    </>
  );
}
