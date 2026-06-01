import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { UserSearch } from '@/components/common/UserSearch';
import { Avatar } from '@/components/common/Avatar';
import api from '@/lib/axios';
import { invalidateDashboardStats } from '@/lib/queryClient';
import type { TaskPriority, User } from '@/types/models';

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = React.useState('');
  const [assignee, setAssignee] = React.useState<User | null>(null);

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title,
        description,
        priority,
      };
      if (dueDate) payload.dueDate = new Date(dueDate).toISOString();
      if (assignee) payload.assignee = assignee._id;

      const response = await api.post('/tasks', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      invalidateDashboardStats(queryClient);
      toast.success('Task created successfully!');
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setAssignee(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create task');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    createTaskMutation.mutate();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent onClose={onClose}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a new item to your team workspace board.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4 text-left">
            <div>
              <Label htmlFor="taskTitle" required>
                Task Title
              </Label>
              <Input
                id="taskTitle"
                type="text"
                placeholder="Write specs for review..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="taskDesc">Description</Label>
              <Textarea
                id="taskDesc"
                placeholder="Details about task requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Assignee</Label>
              {assignee ? (
                <div className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Avatar name={assignee.name} src={assignee.avatar} size="sm" />
                    <span className="text-xs font-bold text-foreground">{assignee.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignee(null)}
                    className="text-[10px] text-destructive hover:underline font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <UserSearch onSelect={setAssignee} placeholder="Assign teammate..." />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createTaskMutation.isPending}>
              Create Card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default CreateTaskDialog;
