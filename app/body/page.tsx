import { addDays, subDays, startOfDay } from 'date-fns';
import { BodyContent } from '@/components/body/BodyContent';
import { getWorkoutsInRange } from '@/lib/server-data';

export default async function BodyPage() {
  // Workouts is the default tab, so prefetch the current week on the server.
  // This mirrors the week window WorkoutPlanner computes for weekOffset 0.
  const today = new Date();
  const weekStart = subDays(startOfDay(today), today.getDay());
  const weekEnd = addDays(weekStart, 6);

  const workouts = await getWorkoutsInRange(weekStart.toISOString(), weekEnd.toISOString());

  return <BodyContent initialWorkouts={workouts} />;
}
