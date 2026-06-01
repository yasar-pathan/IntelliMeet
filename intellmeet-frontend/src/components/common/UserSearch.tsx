import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { useDebounce } from '@/hooks/useDebounce';
import { Avatar } from '@/components/common/Avatar';
import type { User } from '@/types/models';
import type { ApiResponse } from '@/types/api';
import { cn } from '@/lib/utils';

export interface UserSearchProps {
  onSelect: (user: User) => void;
  placeholder?: string;
  excludeIds?: string[];
  className?: string;
}

export const UserSearch: React.FC<UserSearchProps> = ({
  onSelect,
  placeholder = 'Search team members...',
  excludeIds = [],
  className,
}) => {
  const [query, setQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Fetch users matching query
  const { data, isLoading } = useQuery<ApiResponse<User[]>>({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: async () => {
      const response = await api.get<ApiResponse<User[]>>('/users/search', {
        params: { q: debouncedQuery },
      });
      return response.data;
    },
    enabled: debouncedQuery.length >= 2,
  });

  const searchResults = data?.data || [];
  const filteredResults = searchResults.filter(
    (user) => !excludeIds.includes(user._id)
  );

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (user: User) => {
    onSelect(user);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-8 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all duration-200"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
          {isLoading && query.length >= 2 ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
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
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
          {isLoading ? (
            <div className="p-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-primary" /> Searching...
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="py-1">
              {filteredResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleSelect(user)}
                  className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted text-foreground transition-colors duration-150 cursor-pointer"
                >
                  <Avatar name={user.name} src={user.avatar} size="sm" isOnline={user.isOnline} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate">{user.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground">
              No team members found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
