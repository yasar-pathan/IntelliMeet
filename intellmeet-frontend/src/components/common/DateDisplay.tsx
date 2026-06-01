import * as React from 'react';
import { formatRelativeTime, formatDateDisplay, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export interface DateDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  date: string | Date;
  formatType?: 'relative' | 'display' | 'datetime';
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  formatType = 'relative',
  className,
  ...props
}) => {
  const dateString = typeof date === 'string' ? date : date.toISOString();
  
  let displayText = '';
  try {
    if (formatType === 'relative') {
      displayText = formatRelativeTime(dateString);
    } else if (formatType === 'display') {
      displayText = formatDateDisplay(dateString);
    } else {
      displayText = formatDateTime(dateString);
    }
  } catch (error) {
    displayText = 'Invalid date';
  }

  return (
    <span className={cn('text-xs text-muted-foreground', className)} {...props}>
      {displayText}
    </span>
  );
};
