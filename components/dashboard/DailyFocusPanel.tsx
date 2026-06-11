'use client';
import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Circle, X, Sparkles, BookOpen, Star, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IDailyFocusItem } from '@/types';
import { TaskPickerModal } from './TaskPickerModal';

const SOURCE_ICON: Record<string, React.ReactNode> = {
  assignment_subtask: <BookOpen className="w-3 h-3 text-academic" />,
  project_task:       <Star className="w-3 h-3 text-extracurricular" />,
  body_goal_subtask:  <Dumbbell className="w-3 h-3 text-body" />,
};

export function DailyFocusPanel() {
  const [items, setItems]           = useState<IDailyFocusItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  const fetchItems = async () => {
    const res = await fetch('/api/daily-focus');
    const data = await res.json();
    setItems(data.items ?? []);
  };

  useEffect(() => { fetchItems().finally(() => setLoading(false)); }, []);

  const toggle = async (item: IDailyFocusItem) => {
    const next = !item.completed;
    // Optimistic
    setItems(prev => prev.map(i => i._id === item._id ? { ...i, completed: next } : i));
    await fetch(`/api/daily-focus/${item._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: next }),
    });
  };

  const remove = async (item: IDailyFocusItem) => {
    setItems(prev => prev.filter(i => i._id !== item._id));
    await fetch(`/api/daily-focus/${item._id}`, { method: 'DELETE' });
  };

  const addItem = async (newItem: Omit<IDailyFocusItem, '_id' | 'addedAt' | 'completed'>) => {
    const res = await fetch('/api/daily-focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    const created = await res.json();
    setItems(prev => [...prev, { ...created, completed: false }]);
  };

  const done  = items.filter(i => i.completed).length;
  const total = items.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  if (loading) {
    return <div className="h-28 bg-muted rounded-3xl animate-pulse" />;
  }

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
            {/* Incomplete first, then completed */}
            {[...items].sort((a, b) => Number(a.completed) - Number(b.completed)).map(item => (
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {SOURCE_ICON[item.sourceType]}
                    <span className="text-xs text-sidebar-muted truncate">{item.parentTitle}</span>
                  </div>
                </div>

                <button
                  onClick={() => remove(item)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-sidebar-muted hover:text-destructive transition-all"
                  title="Remove from today's focus"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
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
