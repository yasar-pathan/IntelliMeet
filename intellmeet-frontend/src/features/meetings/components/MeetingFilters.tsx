import * as React from 'react';
import { SearchInput } from '@/components/common/SearchInput';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';

interface MeetingFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  hideStatusFilter?: boolean;
}

export const MeetingFilters: React.FC<MeetingFiltersProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  hideStatusFilter = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-card border border-border rounded-xl mb-6 shadow-sm select-none">
      {/* Search Input */}
      <div className="w-full sm:flex-1">
        <SearchInput
          placeholder="Search meetings by title..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {!hideStatusFilter && (
        <div className="w-full sm:w-48 flex items-center gap-2">
          <Label htmlFor="statusFilter" className="shrink-0 hidden sm:block">
            Status:
          </Label>
          <Select
            id="statusFilter"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="ended">Ended</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      )}
    </div>
  );
};
