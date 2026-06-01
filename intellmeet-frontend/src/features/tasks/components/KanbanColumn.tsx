import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus } from '@/types/models';

interface KanbanColumnProps {
  title: string;
  id: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  id,
  tasks,
  onTaskClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  // Map task IDs for sortable context
  const taskIds = React.useMemo(() => tasks.map((t) => t._id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-full min-w-[260px] max-w-[340px] h-[calc(100vh-220px)] bg-muted/20 border border-border/30 rounded-xl p-3 select-none transition-colors duration-200 ${
        isOver ? 'bg-primary/5 border-primary/20' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1.5 border-b border-border/30 shrink-0">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
          {title}
        </span>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">
          {tasks.length}
        </span>
      </div>

      {/* Task Cards Stack Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mt-3 space-y-3 pr-1">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="text-center py-10 text-[10px] text-muted-foreground border border-dashed border-border/40 rounded-lg bg-card/10">
            No cards
          </div>
        )}
      </div>
    </div>
  );
};
export default KanbanColumn;
