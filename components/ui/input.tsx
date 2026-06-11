import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex w-full rounded-xl border border-border-strong bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
