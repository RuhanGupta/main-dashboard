'use client';
import Link from 'next/link';
import { cn, formatDateShort, priorityColor, statusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';

interface TaskItemProps {
  title: string;
  subtitle?: string;
  dueDate?: string | Date;
  priority?: string;
  status?: string;
  href?: string;
  onToggle?: () => void;
  completed?: boolean;
}

export function TaskItem({ title, subtitle, dueDate, priority, status, href, onToggle, completed }: TaskItemProps) {
  const isComplete = status === 'completed' || completed;

  const content = (
    <div className={cn(
      'flex items-start gap-2.5 p-2.5 rounded-lg transition-colors',
      href ? 'hover:bg-gray-50 cursor-pointer' : '',
      isComplete ? 'opacity-60' : ''
    )}>
      {onToggle ? (
        <button onClick={e => { e.preventDefault(); onToggle(); }} className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-indigo-600 transition-colors">
          {isComplete ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4" />}
        </button>
      ) : (
        <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', priority === 'urgent' ? 'bg-red-500' : priority === 'high' ? 'bg-orange-400' : priority === 'medium' ? 'bg-yellow-400' : 'bg-gray-300')} />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-gray-800 truncate', isComplete && 'line-through text-gray-400')}>
          {title}
        </p>
        {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
      </div>
      {dueDate && (
        <span className="text-xs text-gray-400 flex-shrink-0">{formatDateShort(dueDate)}</span>
      )}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
