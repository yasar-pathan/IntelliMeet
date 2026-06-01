import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  className,
}) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            'absolute z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md animate-in fade-in-0 zoom-in-95 duration-150 select-none pointer-events-none whitespace-nowrap',
            {
              'bottom-full left-1/2 -translate-x-1/2 mb-2': side === 'top',
              'top-full left-1/2 -translate-x-1/2 mt-2': side === 'bottom',
              'right-full top-1/2 -translate-y-1/2 mr-2': side === 'left',
              'left-full top-1/2 -translate-y-1/2 ml-2': side === 'right',
            },
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
