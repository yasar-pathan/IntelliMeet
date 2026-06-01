import * as React from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn, getStatusColor, getPriorityColor } from '@/lib/utils';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: 'scheduled' | 'active' | 'ended' | 'cancelled' | 'todo' | 'in-progress' | 'review' | 'done' | string;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  priority,
  className,
  ...props
}) => {
  if (priority) {
    const formattedPriority = priority.toLowerCase();
    const colorClass = getPriorityColor(formattedPriority);
    return (
      <Badge
        variant="outline"
        className={cn('border-none font-semibold capitalize', colorClass, className)}
        {...props}
      >
        {formattedPriority}
      </Badge>
    );
  }

  if (status) {
    const formattedStatus = status.toLowerCase();
    const colorClass = getStatusColor(formattedStatus);
    
    // Custom label transformations for cleaner display
    let label = formattedStatus;
    if (formattedStatus === 'todo') label = 'To Do';
    if (formattedStatus === 'in-progress') label = 'In Progress';
    if (formattedStatus === 'live') label = 'Live';

    return (
      <Badge
        variant="outline"
        className={cn('border-none font-semibold capitalize', colorClass, className)}
        {...props}
      >
        {label}
      </Badge>
    );
  }

  return null;
};
