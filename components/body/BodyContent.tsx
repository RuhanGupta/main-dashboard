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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <Dumbbell className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Body</h1>
          <p className="text-sm text-gray-500">Workouts, habits & fitness goals</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'workouts' && <WorkoutPlanner />}
      {tab === 'habits' && <HabitTracker />}
      {tab === 'goals' && <BodyGoals />}
    </div>
  );
}
