'use client';
import Link from 'next/link';
import { IAssignment } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, priorityColor, statusColor, formatDateShort } from '@/lib/utils';
import { CheckCircle2, ChevronRight, Clock } from 'lucide-react';

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
    <Card className="group lift hover:border-academic-line">
      <div className="flex items-start gap-3 p-4">
        <button
          onClick={toggleStatus}
          className="mt-0.5 flex-shrink-0 text-border-strong hover:text-success-deep hover:scale-110 transition-all"
        >
          <CheckCircle2 className={cn('w-5 h-5', assignment.status === 'completed' ? 'text-success-deep' : '')} />
        </button>
        <div className="flex-1 min-w-0">
          <Link href={`/academics/${assignment._id}`} className="block">
            <div className="flex items-start justify-between gap-2">
              <p className={cn('font-medium text-foreground group-hover:text-academic-deep transition-colors', assignment.status === 'completed' && 'line-through text-muted-foreground')}>
                {assignment.title}
              </p>
              <ChevronRight className="w-4 h-4 text-border-strong group-hover:text-academic-deep group-hover:translate-x-0.5 flex-shrink-0 mt-0.5 transition-all" />
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
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDateShort(assignment.dueDate)}
              </span>
            )}
          </div>
          {total > 0 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{completed}/{total} subtasks</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-academic h-1.5 rounded-full transition-all duration-500"
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
