import * as React from 'react';
import {
  DndContext,
  type DragEndEvent,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import type { Task, TaskStatus } from '@/types/models';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDragEnd: (taskId: string, targetStatus: TaskStatus, newIndex: number) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskClick,
  onDragEnd,
}) => {
  // Set up dnd sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require dragging 8px before initiating to prevent conflict with clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by their current column status
  const columns: Record<TaskStatus, Task[]> = React.useMemo(() => {
    const defaultCols: Record<TaskStatus, Task[]> = {
      todo: [],
      'in-progress': [],
      review: [],
      done: [],
      cancelled: [], // Hidden or mapped elsewhere
    };

    tasks.forEach((task) => {
      if (defaultCols[task.status]) {
        defaultCols[task.status].push(task);
      }
    });

    // Sort tasks in each column by order
    Object.keys(defaultCols).forEach((key) => {
      defaultCols[key as TaskStatus].sort((a, b) => a.order - b.order);
    });

    return defaultCols;
  }, [tasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t._id === taskId);
    if (!activeTask) return;

    // Over container or over card?
    let targetStatus: TaskStatus;
    let newIndex = 0;

    const statuses: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];

    if (statuses.includes(overId as TaskStatus)) {
      // Dropped onto empty column container
      targetStatus = overId as TaskStatus;
      newIndex = columns[targetStatus].length;
    } else {
      // Dropped onto another task card
      const targetTask = tasks.find((t) => t._id === overId);
      if (!targetTask) return;

      targetStatus = targetTask.status;
      const targetCol = columns[targetStatus];
      newIndex = targetCol.findIndex((t) => t._id === overId);
      
      // If active item dragged past over item, increment target index
      const activeIndex = targetCol.findIndex((t) => t._id === taskId);
      if (activeIndex !== -1 && activeIndex < newIndex) {
        newIndex += 1;
      }
    }

    onDragEnd(taskId, targetStatus, newIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 select-none items-start">
        <KanbanColumn
          title="To Do"
          id="todo"
          tasks={columns.todo}
          onTaskClick={onTaskClick}
        />
        <KanbanColumn
          title="In Progress"
          id="in-progress"
          tasks={columns['in-progress']}
          onTaskClick={onTaskClick}
        />
        <KanbanColumn
          title="Review"
          id="review"
          tasks={columns.review}
          onTaskClick={onTaskClick}
        />
        <KanbanColumn
          title="Done"
          id="done"
          tasks={columns.done}
          onTaskClick={onTaskClick}
        />
      </div>
    </DndContext>
  );
};
export default KanbanBoard;
