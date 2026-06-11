'use client';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          {
            'bg-primary text-primary-foreground hover:bg-primary-deep shadow-card hover:shadow-glow': variant === 'default',
            'border border-border-strong bg-card text-foreground hover:bg-muted hover:border-primary/40': variant === 'outline',
            'text-muted-foreground hover:bg-muted hover:text-foreground': variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:opacity-90 shadow-card': variant === 'destructive',
            'bg-secondary text-secondary-foreground hover:bg-secondary/70': variant === 'secondary',
          },
          {
            'px-2.5 py-1.5 text-xs': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
            'p-2': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
