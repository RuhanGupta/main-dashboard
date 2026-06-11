'use client';
import { useState } from 'react';
import { Dumbbell, Target, Flame } from 'lucide-react';
import { WorkoutPlanner } from './WorkoutPlanner';
import { HabitTracker } from './HabitTracker';
import { BodyGoals } from './BodyGoals';

type Tab = 'workouts' | 'habits' | 'goals';

export function BodyContent() {
  const [tab, setTab] = useState<Tab>('workouts');

  const tabs: { key: Tab; label: string; icon: typeof Dumbbell }[] = [
    { key: 'workouts', label: 'Workout Planner', icon: Dumbbell },
    { key: 'habits', label: 'Habit Tracker', icon: Flame },
    { key: 'goals', label: 'Summer Goals', icon: Target },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto stagger">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-7">
        <div className="w-11 h-11 bg-body-soft border border-body-line rounded-2xl flex items-center justify-center shadow-card">
          <Dumbbell className="w-5 h-5 text-body-deep" />
        </div>
        <div>
          <h1 className="font-serif text-[1.75rem] font-semibold text-foreground tracking-tight">Body</h1>
          <p className="text-sm text-muted-foreground">Workouts, habits & fitness goals</p>
        </div>
      </div>

      {/* Tabs — segmented pill control */}
      <div className="inline-flex items-center gap-1 bg-muted/80 border border-border rounded-full p-1 mb-7">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
              tab === key
                ? 'bg-card text-body-deep shadow-card'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-fade-up">
        {tab === 'workouts' && <WorkoutPlanner />}
        {tab === 'habits' && <HabitTracker />}
        {tab === 'goals' && <BodyGoals />}
      </div>
    </div>
  );
}
