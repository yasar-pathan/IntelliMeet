import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import api from '@/lib/axios';

interface CreateTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const createTeamMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/teams', {
        name,
        description,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Workspace created successfully!');
      onClose();
      // Reset form
      setName('');
      setDescription('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create team workspace');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    createTeamMutation.mutate();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent onClose={onClose}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Team Workspace</DialogTitle>
            <DialogDescription>Setup a dedicated workspace for your organization members.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4 text-left">
            <div>
              <Label htmlFor="teamName" required>
                Workspace Name
              </Label>
              <Input
                id="teamName"
                type="text"
                placeholder="Product Core, Engineering..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="teamDesc">Description</Label>
              <Textarea
                id="teamDesc"
                placeholder="Brief summary describing workspace purpose..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createTeamMutation.isPending}>
              Create Workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default CreateTeamDialog;
