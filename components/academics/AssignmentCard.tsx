'use client';
import Link from 'next/link';
import { IAssignment } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, priorityColor, statusColor, formatDateShort } from '@/lib/utils';
import { CheckCircle2, ChevronRight, Clock, ExternalLink } from 'lucide-react';

interface Props {
  assignment: IAssignment;
  onUpdate: () => void;
}

export function AssignmentCard({ assignment, onUpdate }: Props) {
  const completed = assignment.subtasks?.filter(s => s.completed).length ?? 0;
  const total = assignment.subtasks?.length ?? 0;

  const toggleStatus = async () => {
    const newStatus = assignment.status === 'completed' ? 'not_started' : 'completed';
    await fetch(`/api/assignments/${assignment._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    onUpdate();
  };

  return (
    <Card className="group hover:shadow-md transition-all">
      <div className="flex items-start gap-3 p-4">
        <button
          onClick={toggleStatus}
          className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors"
        >
          <CheckCircle2 className={cn('w-5 h-5', assignment.status === 'completed' ? 'text-green-500' : '')} />
        </button>
        <div className="flex-1 min-w-0">
          <Link href={`/academics/${assignment._id}`} className="block">
            <div className="flex items-start justify-between gap-2">
              <p className={cn('font-medium text-gray-900 group-hover:text-indigo-600 transition-colors', assignment.status === 'completed' && 'line-through text-gray-400')}>
                {assignment.title}
              </p>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 mt-0.5" />
            </div>
          </Link>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {assignment.priority && (
              <Badge className={cn('text-xs', priorityColor(assignment.priority))}>{assignment.priority}</Badge>
            )}
            {assignment.status && (
              <Badge className={cn('text-xs', statusColor(assignment.status))}>
                {assignment.status.replace('_', ' ')}
              </Badge>
            )}
            {assignment.dueDate && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {formatDateShort(assignment.dueDate)}
              </span>
            )}
          </div>
          {total > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>{completed}/{total} subtasks</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full"
                  style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
