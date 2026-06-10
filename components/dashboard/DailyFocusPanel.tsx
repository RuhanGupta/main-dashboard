'use client';
import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Circle, X, Sparkles, BookOpen, Star, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IDailyFocusItem } from '@/types';
import { TaskPickerModal } from './TaskPickerModal';

const SOURCE_ICON: Record<string, React.ReactNode> = {
  assignment_subtask: <BookOpen className="w-3 h-3 text-blue-400" />,
  project_task:       <Star className="w-3 h-3 text-purple-400" />,
  body_goal_subtask:  <Dumbbell className="w-3 h-3 text-green-400" />,
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
    return <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />;
  }

  return (
    <>
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl border border-indigo-100 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900">Today's Focus</h2>
            {total > 0 && (
              <span className="text-xs text-gray-400 font-normal ml-1">
                {done}/{total} done
              </span>
            )}
          </div>
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tasks
          </button>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mb-4">
            <div className="w-full bg-white rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        {total === 0 ? (
          <div className="text-center py-5">
            <p className="text-sm text-gray-400">No tasks picked yet for today.</p>
            <button
              onClick={() => setShowPicker(true)}
              className="mt-2 text-sm text-indigo-500 hover:text-indigo-700 font-medium"
            >
              Pick your first task →
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Incomplete first, then completed */}
            {[...items].sort((a, b) => Number(a.completed) - Number(b.completed)).map(item => (
              <div
                key={item._id}
                className={cn(
                  'flex items-center gap-3 px-2 py-1.5 rounded-xl group transition-colors',
                  item.completed ? 'opacity-50' : 'hover:bg-white/70'
                )}
              >
                <button
                  onClick={() => toggle(item)}
                  className="flex-shrink-0 text-gray-300 hover:text-indigo-500 transition-colors"
                >
                  {item.completed
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <Circle className="w-4 h-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', item.completed && 'line-through text-gray-400')}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {SOURCE_ICON[item.sourceType]}
                    <span className="text-xs text-gray-400 truncate">{item.parentTitle}</span>
                  </div>
                </div>

                <button
                  onClick={() => remove(item)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-gray-300 hover:text-red-400 transition-all"
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
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
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
