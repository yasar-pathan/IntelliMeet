import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, CheckSquare, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { KanbanBoard } from '@/features/tasks/components/KanbanBoard';
import { TaskFilters } from '@/features/tasks/components/TaskFilters';
import { CreateTaskDialog } from '@/features/tasks/components/CreateTaskDialog';
import { TaskDetailSheet } from '@/features/tasks/components/TaskDetailSheet';
import { useAuthStore } from '@/stores/authStore';
import { invalidateDashboardStats, queryKeys } from '@/lib/queryClient';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Task, TaskStatus, User } from '@/types/models';
import { Button } from '@/components/ui/Button';

export const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [search, setSearch] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [assigneeFilter, setAssigneeFilter] = React.useState('');

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  // Query all tasks
  const { data, isLoading } = useQuery<ApiResponse<{ data: Task[]; total: number }>>({
    queryKey: ['tasks', 'list', priority, assigneeFilter],
    queryFn: async () => {
      let assigneeParam: string | undefined;
      if (assigneeFilter === 'me') assigneeParam = currentUser?._id;
      if (assigneeFilter === 'unassigned') assigneeParam = 'unassigned';

      const response = await api.get<ApiResponse<{ data: Task[]; total: number }>>('/tasks', {
        params: {
          priority: priority || undefined,
          assignee: assigneeParam,
          limit: 100, // Fetch a large batch for Kanban board listing
        },
      });
      return response.data;
    },
  });

  const tasks = data?.data?.data || [];

  // Filter tasks locally by search title
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
  }, [tasks, search]);

  // Update selected task reference if task list updates
  React.useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find((t) => t._id === selectedTask._id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks, selectedTask]);

  // Status mutation with Optimistic Updates
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus; order: number }) => {
      const response = await api.patch(`/tasks/${taskId}/status`, { status });
      return response.data;
    },
    onMutate: async ({ taskId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<ApiResponse<{ data: Task[]; total: number }>>([
        'tasks',
        'list',
        priority,
        assigneeFilter,
      ]);

      // Optimistically update the cache
      if (previousData) {
        const updatedTasks = previousData.data.data.map((task) => {
          if (task._id === taskId) {
            return { ...task, status };
          }
          return task;
        });

        queryClient.setQueryData(['tasks', 'list', priority, assigneeFilter], {
          ...previousData,
          data: { ...previousData.data, data: updatedTasks },
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous state
      if (context?.previousData) {
        queryClient.setQueryData(
          ['tasks', 'list', priority, assigneeFilter],
          context.previousData
        );
      }
      toast.error('Failed to update task status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      invalidateDashboardStats(queryClient);
    },
  });

  // Reorder mutation (when dragging cards and re-arranging orders)
  const reorderTasksMutation = useMutation({
    mutationFn: async (payload: Array<{ taskId: string; status: TaskStatus; order: number }>) => {
      const response = await api.patch('/tasks/reorder', { tasks: payload });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      invalidateDashboardStats(queryClient);
    },
    onError: () => {
      toast.error('Failed to sync Kanban column sorting');
    },
  });

  const handleDragEnd = (taskId: string, targetStatus: TaskStatus, newIndex: number) => {
    // 1. Trigger status change mutation (optimistic!)
    updateTaskStatusMutation.mutate({ taskId, status: targetStatus, order: newIndex });

    // 2. Compute reorder list payload for sorting sync
    const colTasks = filteredTasks
      .filter((t) => t.status === targetStatus && t._id !== taskId)
      .sort((a, b) => a.order - b.order);

    const reordered: Array<{ taskId: string; status: TaskStatus; order: number }> = [];

    // Inject dragged item at newIndex
    colTasks.splice(newIndex, 0, filteredTasks.find((t) => t._id === taskId)!);

    colTasks.forEach((task, idx) => {
      if (task) {
        reordered.push({ taskId: task._id, status: targetStatus, order: idx });
      }
    });

    if (reordered.length > 0) {
      reorderTasksMutation.mutate(reordered);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailSheetOpen(true);
  };

  return (
    <PageContainer>
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Kanban Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track workflow tasks, assign team actions, or sync items generated by meeting summaries.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-1.5 cursor-pointer">
          <Plus className="h-4 w-4" /> Create Task
        </Button>
      </div>

      {/* Filter toolbar */}
      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        priority={priority}
        onPriorityChange={setPriority}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
      />

      {/* Kanban Board Area */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px] bg-card border border-border rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Loading task board...</span>
        </div>
      ) : filteredTasks.length > 0 ? (
        <KanbanBoard
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
          onDragEnd={handleDragEnd}
        />
      ) : (
        <div className="py-12 border border-dashed border-border rounded-xl bg-card/25 text-center flex flex-col items-center justify-center min-h-[300px]">
          <CheckSquare className="h-8 w-8 text-muted-foreground opacity-45 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No tasks found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Create tasks manually or schedule meetings to automatically extract action item cards.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} className="mt-4">
            Create your first task
          </Button>
        </div>
      )}

      {/* Create Modal */}
      <CreateTaskDialog isOpen={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />

      {/* Detail Sliding side sheet */}
      <TaskDetailSheet
        task={selectedTask}
        isOpen={detailSheetOpen}
        onClose={() => {
          setDetailSheetOpen(false);
          setSelectedTask(null);
        }}
      />
    </PageContainer>
  );
};

export default TasksPage;
