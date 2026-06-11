'use client';
import { cn, formatDateShort, priorityColor, statusColor } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';
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
      <Card className="p-14 text-center">
        <CheckCircle2 className="w-12 h-12 text-border-strong mx-auto mb-3" />
        <p className="text-foreground font-serif font-medium text-lg">No tasks due this week!</p>
        <p className="text-sm text-muted-foreground mt-1">Add tasks to your projects to see them here</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2 stagger">
      {tasks.map((task, idx) => (
        <Link key={`${task._id}-${idx}`} href={`/extracurriculars/${task.projectId}`} className="block">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card lift hover:border-extracurricular-line flex items-start gap-3">
            <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', task.priority === 'urgent' ? 'bg-danger' : task.priority === 'high' ? 'bg-warning' : task.priority === 'medium' ? 'bg-info' : 'bg-border-strong')} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{task.title}</p>
              {task.projectTitle && (
                <p className="text-xs text-extracurricular-deep mt-0.5">{task.projectTitle}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {task.priority && <Badge className={cn('text-xs', priorityColor(task.priority))}>{task.priority}</Badge>}
                {task.status && <Badge className={cn('text-xs', statusColor(task.status))}>{task.status.replace('_', ' ')}</Badge>}
                {task.dueDate && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
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
