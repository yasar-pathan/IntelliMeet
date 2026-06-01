import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateDisplay } from '@/lib/utils';
import type { Task, User } from '@/types/models';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const assignee = typeof task.assignee === 'string' ? null : (task.assignee as User);

  const isOverdue = () => {
    if (!task.dueDate || task.status === 'done') return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border border-border bg-card hover:border-border-hover shadow-sm select-none cursor-grab active:cursor-grabbing transition-colors text-left space-y-3 group',
        {
          'ring-2 ring-primary/40': isDragging,
        }
      )}
    >
      {/* Header tags: Priority & ID */}
      <div className="flex items-center justify-between gap-2">
        <StatusBadge priority={task.priority} />
        {task.isAiGenerated && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full select-none">
            ✨ AI
          </span>
        )}
      </div>

      {/* Task Title */}
      <p className="text-xs font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
        {task.title}
      </p>

      {/* Card Footer details */}
      <div className="flex items-center justify-between border-t border-border/30 pt-3 text-[10px] text-muted-foreground">
        {/* Due Date Indicator */}
        {task.dueDate ? (
          <div
            className={cn('flex items-center gap-1 font-medium', {
              'text-destructive': isOverdue(),
            })}
          >
            {isOverdue() ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <Calendar className="h-3.5 w-3.5" />
            )}
            <span>{formatDateDisplay(task.dueDate)}</span>
          </div>
        ) : (
          <div />
        )}

        {/* Right Info: Comments count & Assignee Avatar */}
        <div className="flex items-center gap-2">
          {task.comments?.length > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {task.comments.length}
            </span>
          )}

          {assignee && (
            <Avatar name={assignee.name} src={assignee.avatar} size="sm" title={assignee.name} />
          )}
        </div>
      </div>
    </div>
  );
};
export default TaskCard;
