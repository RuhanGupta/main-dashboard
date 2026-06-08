'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const POMODORO_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60; // 5 minutes

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [totalStudySeconds, setTotalStudySeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        setIsRunning(false);
        return 0;
      }
      return prev - 1;
    });
    if (!isBreak) {
      setTotalStudySeconds(prev => prev + 1);
    }
  }, [isBreak]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, tick]);

  const handleStartPause = () => setIsRunning(r => !r);

  const handleReset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(POMODORO_DURATION);
  };

  const handleBreak = () => {
    setIsRunning(true);
    setIsBreak(true);
    setTimeLeft(BREAK_DURATION);
  };

  const handleResetTotal = () => setTotalStudySeconds(0);

  const progress = isBreak
    ? ((BREAK_DURATION - timeLeft) / BREAK_DURATION) * 100
    : ((POMODORO_DURATION - timeLeft) / POMODORO_DURATION) * 100;

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Pomodoro Timer</h3>
          {isBreak && (
            <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Break
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Circular progress */}
        <div className="flex justify-center mb-5">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#f3f4f6" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke={isBreak ? '#10b981' : '#6366f1'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900 font-mono">{formatTime(timeLeft)}</span>
              <span className="text-xs text-gray-400">{isBreak ? 'break' : 'focus'}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            title="Reset timer"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="md"
            onClick={handleStartPause}
            className="px-6"
          >
            {isRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {isRunning ? 'Pause' : 'Start'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleBreak}
            title="5-min break"
          >
            <Coffee className="w-4 h-4" />
          </Button>
        </div>

        {/* Total study time */}
        <div className="bg-indigo-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-indigo-600">Total Study Time</span>
            <button
              onClick={handleResetTotal}
              className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors"
            >
              Reset
            </button>
          </div>
          <p className="text-xl font-bold text-indigo-700 font-mono">
            {formatTime(totalStudySeconds)}
          </p>
          <p className="text-xs text-indigo-400 mt-0.5">
            {Math.floor(totalStudySeconds / 3600)}h {Math.floor((totalStudySeconds % 3600) / 60)}m studied today
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
