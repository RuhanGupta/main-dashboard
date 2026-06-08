'use client';
import { useEffect, useState } from 'react';
import { Plus, Feather, Calendar, BookOpen, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { IReflection } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Terrible' },
  { value: 2, emoji: '😕', label: 'Bad' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
  { value: 6, emoji: '🤩', label: 'Amazing' },
];

type ReflectionType = 'daily' | 'weekly' | 'monthly';

export function ReflectionContent() {
  const [reflections, setReflections] = useState<IReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeType, setActiveType] = useState<ReflectionType>('daily');
  const [form, setForm] = useState({
    type: 'daily' as ReflectionType,
    date: new Date().toISOString().split('T')[0],
    wins: '',
    lessonsLearned: '',
    thingsToImprove: '',
    mood: 4,
    journalEntry: '',
  });

  const fetchReflections = async () => {
    const res = await fetch('/api/reflections');
    const data = await res.json();
    setReflections(data);
  };

  useEffect(() => { fetchReflections().finally(() => setLoading(false)); }, []);

  const saveReflection = async () => {
    await fetch('/api/reflections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ type: 'daily', date: new Date().toISOString().split('T')[0], wins: '', lessonsLearned: '', thingsToImprove: '', mood: 4, journalEntry: '' });
    fetchReflections();
  };

  const filtered = reflections.filter(r => r.type === activeType);

  const moodAvg = reflections.filter(r => r.mood).length > 0
    ? Math.round(reflections.filter(r => r.mood).reduce((sum, r) => sum + (r.mood ?? 0), 0) / reflections.filter(r => r.mood).length * 10) / 10
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Feather className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reflection</h1>
            <p className="text-sm text-gray-500">{reflections.length} journal entries</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Entry
        </Button>
      </div>

      {/* Mood + Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 col-span-1">
          <p className="text-xs font-medium text-amber-600 mb-1">Average Mood</p>
          <p className="text-3xl">{moodAvg ? MOODS[Math.round(moodAvg) - 1]?.emoji : '–'}</p>
          <p className="text-sm font-semibold text-amber-700">{moodAvg ? `${moodAvg}/6` : 'No data'}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs font-medium text-green-600 mb-1">Daily Entries</p>
          <p className="text-2xl font-bold text-green-700">{reflections.filter(r => r.type === 'daily').length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-600 mb-1">Weekly / Monthly</p>
          <p className="text-2xl font-bold text-blue-700">
            {reflections.filter(r => r.type === 'weekly').length + reflections.filter(r => r.type === 'monthly').length}
          </p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-5">
        {(['daily', 'weekly', 'monthly'] as ReflectionType[]).map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors',
              activeType === type ? 'bg-amber-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Entries */}
      {loading ? (
        <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No {activeType} reflections yet</p>
          <p className="text-sm text-gray-400 mt-1">Start journaling to track your growth</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => (
            <ReflectionCard key={r._id} reflection={r} />
          ))}
        </div>
      )}

      {/* Form modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Reflection" className="max-w-2xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ReflectionType }))}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>

          {/* Mood selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mood</label>
            <div className="flex gap-2">
              {MOODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setForm(f => ({ ...f, mood: m.value }))}
                  className={cn(
                    'flex flex-col items-center p-2 rounded-xl border-2 transition-all text-xs',
                    form.mood === m.value ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-gray-500 mt-0.5">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🏆 Wins</label>
            <Textarea value={form.wins} onChange={e => setForm(f => ({ ...f, wins: e.target.value }))} placeholder="What went well? What are you proud of?" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">💡 Lessons Learned</label>
            <Textarea value={form.lessonsLearned} onChange={e => setForm(f => ({ ...f, lessonsLearned: e.target.value }))} placeholder="What did you learn?" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📈 Things to Improve</label>
            <Textarea value={form.thingsToImprove} onChange={e => setForm(f => ({ ...f, thingsToImprove: e.target.value }))} placeholder="What would you do differently?" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">✍️ Journal Entry</label>
            <Textarea value={form.journalEntry} onChange={e => setForm(f => ({ ...f, journalEntry: e.target.value }))} placeholder="Free write your thoughts..." rows={4} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={saveReflection}>Save Reflection</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ReflectionCard({ reflection }: { reflection: IReflection }) {
  const mood = MOODS.find(m => m.value === reflection.mood);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              {format(new Date(reflection.date), 'EEEE, MMMM d, yyyy')}
            </span>
            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full capitalize">
              {reflection.type}
            </span>
          </div>
          {mood && (
            <div className="flex items-center gap-1">
              <span className="text-lg">{mood.emoji}</span>
              <span className="text-xs text-gray-500">{mood.label}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reflection.wins && (
          <div>
            <p className="text-xs font-semibold text-green-600 mb-1">🏆 Wins</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{reflection.wins}</p>
          </div>
        )}
        {reflection.lessonsLearned && (
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-1">💡 Lessons Learned</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{reflection.lessonsLearned}</p>
          </div>
        )}
        {reflection.thingsToImprove && (
          <div>
            <p className="text-xs font-semibold text-orange-600 mb-1">📈 Things to Improve</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{reflection.thingsToImprove}</p>
          </div>
        )}
        {reflection.journalEntry && (
          <div>
            <p className="text-xs font-semibold text-purple-600 mb-1">✍️ Journal</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">{reflection.journalEntry}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
