import * as React from 'react';
import { Search } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export interface SearchInputProps extends InputProps {}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
          <Search className="h-4 w-4" />
        </div>
        <Input
          type="text"
          ref={ref}
          className={cn('pl-9', className)}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
