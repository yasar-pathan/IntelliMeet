import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'secondary', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none',
          {
            'bg-primary text-primary-foreground border-transparent': variant === 'primary',
            'bg-secondary text-secondary-foreground border-transparent': variant === 'secondary',
            'border-border text-foreground': variant === 'outline',
            'bg-success/10 text-success border-success/20': variant === 'success',
            'bg-warning/10 text-warning border-warning/20': variant === 'warning',
            'bg-destructive/10 text-destructive border-destructive/20': variant === 'danger',
            'bg-info/10 text-info border-info/20': variant === 'info',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
