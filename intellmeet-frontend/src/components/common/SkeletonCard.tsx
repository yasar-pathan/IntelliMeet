import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn('rounded-md bg-muted animate-shimmer', className)}
      {...props}
    />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="flex flex-col space-y-3 rounded-xl border border-border p-5 bg-card">
      <Skeleton className="h-[125px] w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
};
