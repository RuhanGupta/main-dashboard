import { cn } from '@/lib/utils';
import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex w-full rounded-xl border border-border-strong bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
