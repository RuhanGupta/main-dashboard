'use client';
import { useEffect, useState } from 'react';
import { format, addDays, subDays, startOfDay, isSameDay } from 'date-fns';
import { Plus, Trash2, Edit2, ChevronLeft, ChevronRight, Dumbbell, CheckCircle2, X, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { IWorkout, IExercise } from '@/types';
import { cn } from '@/lib/utils';

export function WorkoutPlanner({ initialWorkouts = [] }: { initialWorkouts?: IWorkout[] }) {
  // Seeded from the server render so the current week paints immediately. The
  // effect below still refreshes in the background, because the API route is
  // what generates any missing recurring occurrences.
  const [workouts, setWorkouts] = useState<IWorkout[]>(initialWorkouts);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<IWorkout | null>(null);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showExerciseDetail, setShowExerciseDetail] = useState<{ workout: IWorkout; exerciseIdx: number } | null>(null);
  const [newWorkoutTitle, setNewWorkoutTitle] = useState('');
  const [repeatFrequency, setRepeatFrequency] = useState<'none' | 'daily' | 'weekly'>('none');

  const today = new Date();
  const dayOfWeek = addDays(today, weekOffset * 7).getDay();
  const weekStart = subDays(startOfDay(addDays(today, weekOffset * 7)), dayOfWeek);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchWorkouts = async () => {
    const start = days[0].toISOString();
    const end = days[6].toISOString();
    const res = await fetch(`/api/workouts?start=${start}&end=${end}`);
    if (!res.ok) return;
    const data = await res.json();
    setWorkouts(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetchWorkouts(); }, [weekOffset]);

  const getWorkoutsForDay = (day: Date) =>
    workouts.filter(w => isSameDay(new Date(w.date), day));

  const createWorkout = async (day: Date) => {
    if (!newWorkoutTitle.trim()) return;
    await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newWorkoutTitle,
        date: day.toISOString(),
        exercises: [],
        completed: false,
        repeatFrequency: repeatFrequency === 'none' ? undefined : repeatFrequency,
      }),
    });
    setNewWorkoutTitle('');
    setRepeatFrequency('none');
    setShowWorkoutForm(false);
    setSelectedDay(null);
    fetchWorkouts();
  };

  const deleteWorkout = async (workout: IWorkout) => {
    if (workout.isRecurring) {
      const unit = workout.recurrenceFrequency === 'daily' ? 'day\'s' : 'week\'s';
      const deleteAllFuture = window.confirm(
        `This is a repeating workout. Click OK to delete this and all future occurrences, or Cancel to delete just this ${unit}.`
      );
      await fetch(`/api/workouts/${workout._id}${deleteAllFuture ? '?scope=future' : ''}`, { method: 'DELETE' });
    } else {
      await fetch(`/api/workouts/${workout._id}`, { method: 'DELETE' });
    }
    fetchWorkouts();
  };

  const toggleWorkout = async (workout: IWorkout) => {
    await fetch(`/api/workouts/${workout._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...workout, completed: !workout.completed }),
    });
    fetchWorkouts();
  };

  const addExercise = async (workout: IWorkout, exercise: IExercise) => {
    const exercises = [...workout.exercises, exercise];
    await fetch(`/api/workouts/${workout._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...workout, exercises }),
    });
    fetchWorkouts();
  };

  const updateExercise = async (workout: IWorkout, idx: number, updates: Partial<IExercise>) => {
    const exercises = [...workout.exercises];
    exercises[idx] = { ...exercises[idx], ...updates };
    await fetch(`/api/workouts/${workout._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...workout, exercises }),
    });
    fetchWorkouts();
    if (showExerciseDetail) {
      const updated = { ...workout, exercises };
      setShowExerciseDetail({ workout: updated as IWorkout, exerciseIdx: idx });
    }
  };

  const deleteExercise = async (workout: IWorkout, idx: number) => {
    const exercises = workout.exercises.filter((_, i) => i !== idx);
    await fetch(`/api/workouts/${workout._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...workout, exercises }),
    });
    fetchWorkouts();
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
          <button onClick={() => setWeekOffset(0)} className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-body-soft text-body-deep hover:bg-body-line/60 transition-colors">
            Today
          </button>
          <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 7-column calendar */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const dayWorkouts = getWorkoutsForDay(day);
          return (
            <div key={i} className={cn('rounded-2xl border overflow-hidden bg-card shadow-card transition-colors', isToday ? 'border-body ring-1 ring-body/30' : 'border-border')}>
              {/* Day header */}
              <div className={cn('px-2 py-2.5 text-center', isToday ? 'bg-body-soft' : 'bg-muted/50')}>
                <p className={cn('text-[10px] uppercase tracking-[0.15em]', isToday ? 'text-body-deep font-semibold' : 'text-muted-foreground')}>{format(day, 'EEE')}</p>
                <p className={cn('text-lg font-serif font-semibold mt-0.5', isToday ? 'text-body-deep' : 'text-foreground')}>
                  {format(day, 'd')}
                </p>
              </div>
              {/* Workouts */}
              <div className="p-1.5 space-y-1 min-h-[100px]">
                {dayWorkouts.map(w => (
                  <div
                    key={w._id}
                    className={cn(
                      'px-2 py-1.5 rounded-lg text-xs cursor-pointer group transition-all duration-200 hover:scale-[1.03]',
                      w.completed ? 'bg-body-soft text-body-deep border border-body-line' : 'bg-secondary/50 text-primary-deep border border-secondary hover:bg-secondary/80'
                    )}
                    onClick={() => setSelectedWorkout(w)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate flex-1 flex items-center gap-1">
                        {w.isRecurring && <Repeat className="w-3 h-3 flex-shrink-0 opacity-60" />}
                        {w.title}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteWorkout(w); }}
                        className="opacity-0 group-hover:opacity-100 text-danger/70 hover:text-danger ml-1 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {w.exercises.length > 0 && (
                      <p className="text-xs opacity-70 mt-0.5">{w.exercises.length} exercises</p>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => { setSelectedDay(day); setShowWorkoutForm(true); }}
                  className="w-full text-center text-xs text-muted-foreground/50 hover:text-body-deep py-1 transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add workout modal */}
      <Modal
        open={showWorkoutForm && selectedDay !== null}
        onClose={() => { setShowWorkoutForm(false); setSelectedDay(null); setRepeatFrequency('none'); }}
        title={`Add Workout – ${selectedDay ? format(selectedDay, 'EEE, MMM d') : ''}`}
      >
        <div className="space-y-3">
          <Input
            placeholder="Workout title (e.g. Push Day, Leg Day)"
            value={newWorkoutTitle}
            onChange={e => setNewWorkoutTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && selectedDay && createWorkout(selectedDay)}
            autoFocus
          />
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Repeat className="w-3.5 h-3.5" /> Repeat
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { value: 'none', label: "Doesn't repeat" },
                { value: 'daily', label: 'Every day' },
                { value: 'weekly', label: 'Every week' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRepeatFrequency(opt.value)}
                  className={cn(
                    'text-xs font-medium px-2 py-1.5 rounded-lg border transition-colors',
                    repeatFrequency === opt.value
                      ? 'bg-body-soft text-body-deep border-body-line'
                      : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted/70'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => selectedDay && createWorkout(selectedDay)}>Create Workout</Button>
            <Button variant="outline" onClick={() => { setShowWorkoutForm(false); setSelectedDay(null); setRepeatFrequency('none'); }}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Workout detail modal */}
      {selectedWorkout && (
        <WorkoutDetailModal
          workout={workouts.find(w => w._id === selectedWorkout._id) ?? selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onToggle={toggleWorkout}
          onAddExercise={addExercise}
          onDeleteExercise={deleteExercise}
          onOpenExercise={(exerciseIdx) => setShowExerciseDetail({ workout: workouts.find(w => w._id === selectedWorkout._id) ?? selectedWorkout, exerciseIdx })}
        />
      )}

      {/* Exercise detail modal */}
      {showExerciseDetail && (
        <ExerciseDetailModal
          workout={showExerciseDetail.workout}
          exerciseIdx={showExerciseDetail.exerciseIdx}
          onClose={() => setShowExerciseDetail(null)}
          onUpdate={updateExercise}
        />
      )}
    </div>
  );
}

function WorkoutDetailModal({ workout, onClose, onToggle, onAddExercise, onDeleteExercise, onOpenExercise }: {
  workout: IWorkout;
  onClose: () => void;
  onToggle: (w: IWorkout) => void;
  onAddExercise: (w: IWorkout, e: IExercise) => void;
  onDeleteExercise: (w: IWorkout, idx: number) => void;
  onOpenExercise: (idx: number) => void;
}) {
  const [newExercise, setNewExercise] = useState({ name: '', sets: '', reps: '', weight: '', duration: '' });
  const [showForm, setShowForm] = useState(false);

  const add = () => {
    if (!newExercise.name.trim()) return;
    onAddExercise(workout, {
      name: newExercise.name,
      sets: newExercise.sets ? Number(newExercise.sets) : undefined,
      reps: newExercise.reps || undefined,
      weight: newExercise.weight || undefined,
      duration: newExercise.duration || undefined,
      previousWeights: [],
    });
    setNewExercise({ name: '', sets: '', reps: '', weight: '', duration: '' });
    setShowForm(false);
  };

  return (
    <Modal open onClose={onClose} title={workout.title} className="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{format(new Date(workout.date), 'EEEE, MMMM d')}</p>
          <button
            onClick={() => onToggle(workout)}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-xl transition-all duration-200 active:scale-95',
              workout.completed ? 'bg-body-soft text-body-deep border border-body-line' : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-border'
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            {workout.completed ? 'Completed' : 'Mark Done'}
          </button>
        </div>

        <div className="space-y-2">
          {workout.exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center">No exercises yet. Add some below!</p>
          ) : (
            workout.exercises.map((ex, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-3 rounded-2xl border border-border bg-muted/40 hover:bg-muted/80 cursor-pointer group transition-colors"
                onClick={() => onOpenExercise(idx)}
              >
                <div className="w-9 h-9 bg-body-soft border border-body-line rounded-xl flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-4 h-4 text-body-deep" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{ex.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.weight && ex.weight].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteExercise(workout, idx); }}
                  className="opacity-0 group-hover:opacity-100 text-danger/70 hover:text-danger p-1 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {showForm ? (
          <div className="bg-muted/60 border border-border rounded-2xl p-3.5 space-y-2 animate-scale-in">
            <Input placeholder="Exercise name *" value={newExercise.name} onChange={e => setNewExercise(ex => ({ ...ex, name: e.target.value }))} />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Sets" type="number" value={newExercise.sets} onChange={e => setNewExercise(ex => ({ ...ex, sets: e.target.value }))} />
              <Input placeholder="Reps" value={newExercise.reps} onChange={e => setNewExercise(ex => ({ ...ex, reps: e.target.value }))} />
              <Input placeholder="Weight" value={newExercise.weight} onChange={e => setNewExercise(ex => ({ ...ex, weight: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={add}>Add Exercise</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Exercise
          </Button>
        )}
      </div>
    </Modal>
  );
}

function ExerciseDetailModal({ workout, exerciseIdx, onClose, onUpdate }: {
  workout: IWorkout;
  exerciseIdx: number;
  onClose: () => void;
  onUpdate: (workout: IWorkout, idx: number, updates: Partial<IExercise>) => void;
}) {
  const exercise = workout.exercises[exerciseIdx];
  const [form, setForm] = useState({
    name: exercise?.name ?? '',
    sets: exercise?.sets?.toString() ?? '',
    reps: exercise?.reps ?? '',
    weight: exercise?.weight ?? '',
    duration: exercise?.duration ?? '',
    notes: exercise?.notes ?? '',
    formTips: exercise?.formTips ?? '',
  });
  const [newWeight, setNewWeight] = useState({ weight: '', reps: '' });

  if (!exercise) return null;

  const save = () => {
    onUpdate(workout, exerciseIdx, {
      name: form.name,
      sets: form.sets ? Number(form.sets) : undefined,
      reps: form.reps || undefined,
      weight: form.weight || undefined,
      duration: form.duration || undefined,
      notes: form.notes || undefined,
      formTips: form.formTips || undefined,
    });
  };

  const addWeightEntry = () => {
    if (!newWeight.weight) return;
    const entry = { date: new Date().toISOString().split('T')[0], weight: newWeight.weight, reps: newWeight.reps };
    const previousWeights = [...(exercise.previousWeights ?? []), entry];
    onUpdate(workout, exerciseIdx, { previousWeights });
    setNewWeight({ weight: '', reps: '' });
  };

  return (
    <Modal open onClose={onClose} title={exercise.name} className="max-w-md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Sets</label>
            <Input type="number" value={form.sets} onChange={e => setForm(f => ({ ...f, sets: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Reps</label>
            <Input value={form.reps} onChange={e => setForm(f => ({ ...f, reps: e.target.value }))} placeholder="e.g. 8-12" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Weight</label>
            <Input value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="e.g. 135 lbs" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Form Tips</label>
          <Textarea value={form.formTips} onChange={e => setForm(f => ({ ...f, formTips: e.target.value }))} rows={2} placeholder="Keep back straight, squeeze at top..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Personal reminders..." />
        </div>

        {/* Weight history */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Weight History</label>
          <div className="space-y-1 max-h-32 overflow-y-auto mb-2">
            {(exercise.previousWeights ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No history yet.</p>
            ) : (
              [...(exercise.previousWeights ?? [])].reverse().map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-muted/60 border border-border/60 rounded-lg px-3 py-1.5">
                  <span className="text-muted-foreground">{entry.date}</span>
                  <span className="font-medium text-foreground">{entry.weight} × {entry.reps || '?'}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Weight" value={newWeight.weight} onChange={e => setNewWeight(w => ({ ...w, weight: e.target.value }))} className="flex-1" />
            <Input placeholder="Reps" value={newWeight.reps} onChange={e => setNewWeight(w => ({ ...w, reps: e.target.value }))} className="w-20" />
            <Button size="sm" onClick={addWeightEntry}>Log</Button>
          </div>
        </div>

        <Button className="w-full" onClick={save}>Save Changes</Button>
      </div>
    </Modal>
  );
}
