import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, Trash2, UserPlus, Flag, Loader2 } from 'lucide-react';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Avatar } from '@/components/common/Avatar';
import { UserSearch } from '@/components/common/UserSearch';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TaskComments } from './TaskComments';
import api from '@/lib/axios';
import { invalidateDashboardStats } from '@/lib/queryClient';
import type { Task, User, TaskStatus, TaskPriority } from '@/types/models';

interface TaskDetailSheetProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [assigneeSearchOpen, setAssigneeSearchOpen] = React.useState(false);

  // Editable states
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState<TaskPriority>('medium');
  const [status, setStatus] = React.useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = React.useState('');

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    }
  }, [task]);

  // Update mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (payload: Partial<Task>) => {
      const response = await api.patch(`/tasks/${task?._id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      invalidateDashboardStats(queryClient);
      toast.success('Task updated successfully');
    },
    onError: () => {
      toast.error('Failed to update task details');
    },
  });

  // Status mutation (uses the specific status endpoint in backend)
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: TaskStatus) => {
      const response = await api.patch(`/tasks/${task?._id}/status`, { status: newStatus });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      invalidateDashboardStats(queryClient);
      toast.success('Task status updated');
    },
  });

  // Assignee update mutation
  const updateAssigneeMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const response = await api.patch(`/tasks/${task?._id}`, { assignee: userId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      invalidateDashboardStats(queryClient);
      toast.success('Task assignee updated');
    },
  });

  // Delete mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/tasks/${task?._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      invalidateDashboardStats(queryClient);
      toast.success('Task deleted successfully');
      setDeleteConfirmOpen(false);
      onClose();
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });

  if (!task) return null;

  const handleBlurUpdate = () => {
    const payload: Partial<Task> = {};
    if (title !== task.title) payload.title = title;
    if (description !== task.description) payload.description = description;
    if (dueDate !== (task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '')) {
      payload.dueDate = dueDate ? new Date(dueDate).toISOString() : undefined;
    }

    if (Object.keys(payload).length > 0) {
      updateTaskMutation.mutate(payload);
    }
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as TaskPriority;
    setPriority(val);
    updateTaskMutation.mutate({ priority: val });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as TaskStatus;
    setStatus(val);
    updateStatusMutation.mutate(val);
  };

  const handleAssigneeSelect = (user: User) => {
    updateAssigneeMutation.mutate(user._id);
    setAssigneeSearchOpen(false);
  };

  const handleAssigneeRemove = () => {
    updateAssigneeMutation.mutate(null);
  };

  const assigneeObj = typeof task.assignee === 'string' ? null : (task.assignee as User);

  return (
    <Sheet isOpen={isOpen} onClose={onClose} side="right" className="flex flex-col">
      <SheetHeader>
        <div className="flex items-center justify-between gap-2 pr-6">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
            Task Details
          </span>
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-destructive transition-colors cursor-pointer"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlurUpdate}
          className="text-lg font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none py-1 w-[90%] transition-colors mt-2"
        />
      </SheetHeader>

      {/* Sheet Content Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pt-4 pr-1">
        {/* Priority & Status Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="statusSelect">Status</Label>
            <Select id="statusSelect" value={status} onChange={handleStatusChange}>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          <div className="space-y-1.5 text-left">
            <Label htmlFor="prioritySelect">Priority</Label>
            <Select id="prioritySelect" value={priority} onChange={handlePriorityChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
        </div>

        {/* Due Date Input */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="dueDateInput">Due Date</Label>
          <div className="relative">
            <input
              id="dueDateInput"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={handleBlurUpdate}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all"
            />
          </div>
        </div>

        {/* Assignee Control */}
        <div className="space-y-1.5 text-left pb-4 border-b border-border/30">
          <Label>Assignee</Label>
          {assigneeObj ? (
            <div className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex items-center gap-3">
                <Avatar name={assigneeObj.name} src={assigneeObj.avatar} size="sm" />
                <span className="text-xs font-bold text-foreground">{assigneeObj.name}</span>
              </div>
              <button
                onClick={handleAssigneeRemove}
                className="text-[10px] text-destructive hover:underline font-semibold cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="relative">
              {assigneeSearchOpen ? (
                <div className="space-y-2">
                  <UserSearch onSelect={handleAssigneeSelect} placeholder="Search to assign..." />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAssigneeSearchOpen(false)}
                    className="w-full text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setAssigneeSearchOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 text-xs text-muted-foreground w-full justify-center transition-colors cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" /> Assign teammate
                </button>
              )}
            </div>
          )}
        </div>

        {/* Description text area */}
        <div className="space-y-1.5 text-left pb-4 border-b border-border/30">
          <Label htmlFor="descText">Description</Label>
          <Textarea
            id="descText"
            placeholder="Add detailed task requirements..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleBlurUpdate}
            className="min-h-[100px]"
          />
        </div>

        {/* Comments Feed section */}
        <TaskComments taskId={task._id} comments={task.comments || []} />
      </div>

      {/* Delete confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => deleteTaskMutation.mutate()}
        title="Delete Task?"
        description="Are you sure you want to permanently delete this task? This action cannot be undone."
        isLoading={deleteTaskMutation.isPending}
      />
    </Sheet>
  );
};
export default TaskDetailSheet;
