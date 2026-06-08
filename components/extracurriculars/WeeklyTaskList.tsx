'use client';
import { cn, formatDateShort, priorityColor, statusColor } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import Link from 'next/link';

interface Task {
  _id: string;
  title: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  projectTitle?: string;
  projectId?: string;
}

interface Props {
  tasks: Task[];
  onUpdate: () => void;
}

export function WeeklyTaskList({ tasks, onUpdate }: Props) {
  if (tasks.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No tasks due this week!</p>
        <p className="text-sm text-gray-400 mt-1">Add tasks to your projects to see them here</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, idx) => (
        <Link key={`${task._id}-${idx}`} href={`/extracurriculars/${task.projectId}`}>
          <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-purple-200 transition-all flex items-start gap-3">
            <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-gray-300')} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{task.title}</p>
              {task.projectTitle && (
                <p className="text-xs text-purple-500 mt-0.5">{task.projectTitle}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {task.priority && <Badge className={cn('text-xs', priorityColor(task.priority))}>{task.priority}</Badge>}
                {task.status && <Badge className={cn('text-xs', statusColor(task.status))}>{task.status.replace('_', ' ')}</Badge>}
                {task.dueDate && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatDateShort(task.dueDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
