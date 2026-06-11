'use client';
import Link from 'next/link';
import { IProject } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, priorityColor, statusColor, formatDateShort } from '@/lib/utils';
import { ChevronRight, Clock } from 'lucide-react';

interface Props {
  project: IProject;
  onUpdate: () => void;
}

export function ProjectCard({ project, onUpdate }: Props) {
  const completedTasks = project.tasks?.filter((t: any) => t.status === 'completed').length ?? 0;
  const totalTasks = project.tasks?.length ?? 0;

  return (
    <Link href={`/extracurriculars/${project._id}`} className="block">
      <Card className="group lift hover:border-extracurricular-line p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 justify-between">
              <p className="font-medium text-foreground group-hover:text-extracurricular-deep transition-colors">
                {project.title}
              </p>
              <ChevronRight className="w-4 h-4 text-border-strong group-hover:text-extracurricular-deep group-hover:translate-x-0.5 flex-shrink-0 transition-all" />
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {project.priority && (
                <Badge className={cn('text-xs', priorityColor(project.priority))}>{project.priority}</Badge>
              )}
              {project.status && (
                <Badge className={cn('text-xs', statusColor(project.status))}>{project.status.replace('_', ' ')}</Badge>
              )}
              {project.dueDate && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatDateShort(project.dueDate)}
                </span>
              )}
              {totalTasks > 0 && (
                <span className="text-xs text-muted-foreground">{completedTasks}/{totalTasks} tasks</span>
              )}
            </div>
            {totalTasks > 0 && (
              <div className="mt-2.5 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-extracurricular h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
