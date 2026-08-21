import { AcademicsContent } from '@/components/academics/AcademicsContent';
import { getAssignments, getAcademicRecurringTasks } from '@/lib/server-data';

export default async function AcademicsPage() {
  // Both queries start together on the server, so the page arrives with its
  // data instead of firing two client fetches after hydration.
  const [assignments, recurringTasks] = await Promise.all([
    getAssignments(),
    getAcademicRecurringTasks(),
  ]);

  return (
    <AcademicsContent
      initialAssignments={assignments}
      initialRecurringTasks={recurringTasks}
    />
  );
}
