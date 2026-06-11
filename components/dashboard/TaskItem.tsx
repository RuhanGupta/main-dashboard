'use client';
import Link from 'next/link';
import { cn, formatDateShort } from '@/lib/utils';
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
      'flex items-start gap-2.5 p-2.5 rounded-xl transition-all duration-200',
      href ? 'hover:bg-muted/70 hover:translate-x-0.5 cursor-pointer' : '',
      isComplete ? 'opacity-60' : ''
    )}>
      {onToggle ? (
        <button onClick={e => { e.preventDefault(); onToggle(); }} className="mt-0.5 flex-shrink-0 text-muted-foreground/60 hover:text-primary transition-colors">
          {isComplete ? <CheckCircle2 className="w-4 h-4 text-success-deep" /> : <Circle className="w-4 h-4" />}
        </button>
      ) : (
        <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', priority === 'urgent' ? 'bg-danger' : priority === 'high' ? 'bg-warning' : priority === 'medium' ? 'bg-info' : 'bg-border-strong')} />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-foreground truncate', isComplete && 'line-through text-muted-foreground')}>
          {title}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {dueDate && (
        <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">{formatDateShort(dueDate)}</span>
      )}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
