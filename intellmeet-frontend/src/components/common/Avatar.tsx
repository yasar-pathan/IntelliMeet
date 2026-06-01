import * as React from 'react';
import { cn, getInitials, getAvatarUrl } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline,
  className,
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);
  const initials = getInitials(name);

  const sizePixels = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  };

  const optimizedSrc = src ? getAvatarUrl(src, sizePixels[size]) : undefined;

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-semibold select-none border border-border/30 bg-muted text-muted-foreground',
        {
          'h-8 w-8 text-xs': size === 'sm',
          'h-10 w-10 text-sm': size === 'md',
          'h-14 w-14 text-base': size === 'lg',
          'h-20 w-20 text-xl': size === 'xl',
        },
        className
      )}
      {...props}
    >
      {optimizedSrc && !imageError ? (
        <img
          src={optimizedSrc}
          alt={name}
          onError={() => setImageError(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}

      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
            {
              'bg-success': isOnline,
              'bg-muted-foreground/40': !isOnline,
              'h-2 w-2': size === 'sm',
              'h-2.5 w-2.5': size === 'md',
              'h-3.5 w-3.5': size === 'lg',
              'h-4.5 w-4.5': size === 'xl',
            }
          )}
        />
      )}
    </div>
  );
};
