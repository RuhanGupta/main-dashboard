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
    <Link href={`/extracurriculars/${project._id}`}>
      <Card className="group hover:shadow-md transition-all p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 justify-between">
              <p className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                {project.title}
              </p>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 flex-shrink-0" />
            </div>
            {project.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {project.priority && (
                <Badge className={cn('text-xs', priorityColor(project.priority))}>{project.priority}</Badge>
              )}
              {project.status && (
                <Badge className={cn('text-xs', statusColor(project.status))}>{project.status.replace('_', ' ')}</Badge>
              )}
              {project.dueDate && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {formatDateShort(project.dueDate)}
                </span>
              )}
              {totalTasks > 0 && (
                <span className="text-xs text-gray-400">{completedTasks}/{totalTasks} tasks</span>
              )}
            </div>
            {totalTasks > 0 && (
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-purple-500 h-1.5 rounded-full"
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
