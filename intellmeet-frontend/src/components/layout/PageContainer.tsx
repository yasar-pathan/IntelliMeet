import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  fluid?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  fluid = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-4 md:px-6 md:py-6 transition-all duration-200',
        {
          'max-w-7xl': !fluid,
          'max-w-full': fluid,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
