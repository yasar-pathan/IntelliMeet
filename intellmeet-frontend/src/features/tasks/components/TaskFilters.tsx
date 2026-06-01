import * as React from 'react';
import { SearchInput } from '@/components/common/SearchInput';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';

interface TaskFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  priority: string;
  onPriorityChange: (val: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (val: string) => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  assigneeFilter,
  onAssigneeFilterChange,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-card border border-border rounded-xl mb-6 shadow-sm select-none">
      {/* Search text box */}
      <div className="w-full md:flex-1">
        <SearchInput
          placeholder="Search tasks by title..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Select filters Stack */}
      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
        {/* Priority Select */}
        <div className="w-full sm:w-44 flex items-center gap-2">
          <Label htmlFor="priorityFilter" className="shrink-0 hidden sm:block">
            Priority:
          </Label>
          <Select
            id="priorityFilter"
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>

        {/* Assignee Filter */}
        <div className="w-full sm:w-44 flex items-center gap-2">
          <Label htmlFor="assigneeFilter" className="shrink-0 hidden sm:block">
            Assignee:
          </Label>
          <Select
            id="assigneeFilter"
            value={assigneeFilter}
            onChange={(e) => onAssigneeFilterChange(e.target.value)}
          >
            <option value="">All Assignees</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </Select>
        </div>
      </div>
    </div>
  );
};
export default TaskFilters;
