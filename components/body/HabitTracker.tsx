'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Flame, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { IHabit } from '@/types';
import { cn } from '@/lib/utils';
import { format, subDays, eachDayOfInterval } from 'date-fns';

const HABIT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
];

const EMOJI_OPTIONS = ['🏃', '💧', '📚', '🧘', '🌙', '💪', '🥗', '🎯', '✍️', '🛌'];

export function HabitTracker() {
  const [habits, setHabits] = useState<IHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', frequency: 'daily', color: HABIT_COLORS[0], icon: '🎯' });

  const today = format(new Date(), 'yyyy-MM-dd');
  const last21Days = eachDayOfInterval({
    start: subDays(new Date(), 20),
    end: new Date(),
  }).map(d => format(d, 'yyyy-MM-dd'));

  const fetchHabits = async () => {
    const res = await fetch('/api/habits');
    const data = await res.json();
    setHabits(data);
  };

  useEffect(() => { fetchHabits().finally(() => setLoading(false)); }, []);

  const isCompleted = (habit: IHabit, date: string) =>
    habit.completions?.some(c => c.date === date && c.completed);

  const toggleHabit = async (habit: IHabit, date: string) => {
    const existing = habit.completions?.find(c => c.date === date);
    let completions = [...(habit.completions ?? [])];
    if (existing) {
      completions = completions.filter(c => c.date !== date);
    } else {
      completions.push({ date, completed: true });
    }

    // Calculate streak
    let streak = 0;
    let d = new Date();
    while (true) {
      const dateStr = format(d, 'yyyy-MM-dd');
      if (completions.some(c => c.date === dateStr && c.completed)) {
        streak++;
        d = subDays(d, 1);
      } else break;
    }

    await fetch(`/api/habits/${habit._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...habit, completions, streak }),
    });
    fetchHabits();
  };

  const addHabit = async () => {
    if (!newHabit.name.trim()) return;
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newHabit, completions: [], streak: 0 }),
    });
    setNewHabit({ name: '', frequency: 'daily', color: HABIT_COLORS[0], icon: '🎯' });
    setShowForm(false);
    fetchHabits();
  };

  const deleteHabit = async (id: string) => {
    await fetch(`/api/habits/${id}`, { method: 'DELETE' });
    fetchHabits();
  };

  const completionRate = (habit: IHabit) => {
    const relevant = last21Days;
    const completed = relevant.filter(d => isCompleted(habit, d)).length;
    return Math.round((completed / relevant.length) * 100);
  };

  if (loading) return <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Habit Tracker</h2>
          <p className="text-sm text-gray-500">21-day heatmap · {habits.length} habits</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />Add Habit
        </Button>
      </div>

      {/* Date headers for heatmap */}
      {habits.length > 0 && (
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Date row */}
            <div className="flex items-center gap-2 mb-1 pl-48">
              {last21Days.map((d, i) => (
                <div key={d} className="w-7 text-center">
                  <span className="text-xs text-gray-400">{i === 0 || new Date(d).getDate() === 1 ? format(new Date(d), 'MMM d') : format(new Date(d), 'd')}</span>
                </div>
              ))}
            </div>

            {/* Habits */}
            <div className="space-y-2">
              {habits.map(habit => {
                const rate = completionRate(habit);
                return (
                  <div key={habit._id} className="flex items-center gap-2">
                    {/* Habit info */}
                    <div className="w-44 flex-shrink-0 flex items-center gap-2">
                      <span className="text-lg">{habit.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{habit.name}</p>
                        <div className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-400" />
                          <span className="text-xs text-gray-400">{habit.streak} day streak</span>
                        </div>
                      </div>
                    </div>

                    {/* Completion % */}
                    <div className="w-10 text-right">
                      <span className="text-xs font-medium" style={{ color: habit.color }}>{rate}%</span>
                    </div>

                    {/* Heatmap squares */}
                    <div className="flex items-center gap-2">
                      {last21Days.map(d => {
                        const done = isCompleted(habit, d);
                        const isToday = d === today;
                        return (
                          <button
                            key={d}
                            onClick={() => toggleHabit(habit, d)}
                            className={cn(
                              'w-7 h-7 rounded-md transition-all hover:scale-110',
                              done ? 'opacity-100 shadow-sm' : 'bg-gray-100 hover:bg-gray-200',
                              isToday && !done && 'ring-2 ring-offset-1',
                            )}
                            style={{
                              backgroundColor: done ? habit.color : undefined,
                            }}
                            title={d}
                          >
                            {done && <Check className="w-3.5 h-3.5 text-white mx-auto" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteHabit(habit._id!)}
                      className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Today's habits at-a-glance */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Today's Habits</h3>
        <div className="grid grid-cols-2 gap-2">
          {habits.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-gray-400">
              <Flame className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="font-medium">No habits yet</p>
              <p className="text-sm">Add your first habit above!</p>
            </div>
          ) : (
            habits.map(habit => {
              const done = isCompleted(habit, today);
              return (
                <button
                  key={habit._id}
                  onClick={() => toggleHabit(habit, today)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                    done ? 'border-transparent text-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                  style={{ backgroundColor: done ? habit.color : undefined }}
                >
                  <span className="text-2xl">{habit.icon}</span>
                  <div>
                    <p className={cn('text-sm font-medium', done ? 'text-white' : 'text-gray-800')}>{habit.name}</p>
                    <div className="flex items-center gap-1">
                      <Flame className={cn('w-3 h-3', done ? 'text-white/70' : 'text-orange-400')} />
                      <span className={cn('text-xs', done ? 'text-white/70' : 'text-gray-400')}>{habit.streak}</span>
                    </div>
                  </div>
                  <div className="ml-auto">
                    {done ? <Check className="w-5 h-5 text-white" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-200" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Add Habit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Habit">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Habit Name</label>
            <Input value={newHabit.name} onChange={e => setNewHabit(h => ({ ...h, name: e.target.value }))} placeholder="e.g. Walk 10k steps" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <Select value={newHabit.frequency} onChange={e => setNewHabit(h => ({ ...h, frequency: e.target.value as any }))}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setNewHabit(h => ({ ...h, icon: emoji }))}
                  className={cn('w-10 h-10 text-xl rounded-lg border-2 transition-all', newHabit.icon === emoji ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300')}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewHabit(h => ({ ...h, color }))}
                  className={cn('w-8 h-8 rounded-full border-4 transition-all', newHabit.color === color ? 'border-gray-800 scale-110' : 'border-transparent')}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={addHabit}>Add Habit</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
