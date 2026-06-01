import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right' | 'bottom';
  className?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  children,
  side = 'right',
  className,
}) => {
  // Close on Escape key press
  useKeyboardShortcuts([
    {
      key: 'Escape',
      handler: onClose,
    },
  ]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      {/* Sheet Content wrapper */}
      <div
        className={cn(
          'fixed z-10 flex flex-col gap-4 bg-card border-border p-6 shadow-lg outline-none text-foreground transition-transform duration-300 ease-in-out',
          {
            // Position/Size modifiers based on side
            'inset-y-0 right-0 h-full w-full sm:max-w-md border-l animate-in slide-in-from-right':
              side === 'right',
            'inset-y-0 left-0 h-full w-full sm:max-w-md border-r animate-in slide-in-from-left':
              side === 'left',
            'inset-x-0 bottom-0 w-full max-h-[85vh] border-t animate-in slide-in-from-bottom':
              side === 'bottom',
          },
          className
        )}
      >
        {children}
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none cursor-pointer"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

export const SheetHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-left pb-4 border-b border-border/30', className)}
    {...props}
  />
);

export const SheetFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-auto pt-4 border-t border-border/30',
      className
    )}
    {...props}
  />
);

export const SheetTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => (
  <h2
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
);

export const SheetDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, ...props }) => (
  <p
    className={cn('text-sm text-muted-foreground mt-1.5', className)}
    {...props}
  />
);
