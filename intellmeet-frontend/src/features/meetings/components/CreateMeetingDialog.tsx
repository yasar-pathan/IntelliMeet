import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import api from '@/lib/axios';

interface CreateMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateMeetingDialog: React.FC<CreateMeetingDialogProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [scheduledAt, setScheduledAt] = React.useState('');
  const [isPasswordProtected, setIsPasswordProtected] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [waitingRoom, setWaitingRoom] = React.useState(false);

  const createMeetingMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title,
        description,
        isPasswordProtected,
        settings: {
          waitingRoom,
        },
      };
      if (scheduledAt) payload.scheduledAt = new Date(scheduledAt).toISOString();
      if (isPasswordProtected && password) payload.password = password;

      const response = await api.post('/meetings', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Meeting scheduled successfully!');
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setScheduledAt('');
      setIsPasswordProtected(false);
      setPassword('');
      setWaitingRoom(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create meeting');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    createMeetingMutation.mutate();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent onClose={onClose}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Schedule a Meeting</DialogTitle>
            <DialogDescription>Create a collaborative meeting session for your team.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4 text-left">
            <div>
              <Label htmlFor="title" required>
                Meeting Title
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="Product design review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Discuss user flows, wireframes, and branding guidelines."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="scheduledAt">Scheduled Time (Optional)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Leave blank to start an instant meeting room immediately.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
              <div>
                <Label htmlFor="passwordProtect" className="text-sm font-bold text-foreground">
                  Password Protection
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Require a password to join this meeting room.
                </p>
              </div>
              <Switch
                id="passwordProtect"
                checked={isPasswordProtected}
                onCheckedChange={setIsPasswordProtected}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
              <div>
                <Label htmlFor="waitingRoom" className="text-sm font-bold text-foreground">
                  Ask permission to join
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Require guest permission approval before entry is allowed.
                </p>
              </div>
              <Switch
                id="waitingRoom"
                checked={waitingRoom}
                onCheckedChange={setWaitingRoom}
              />
            </div>

            {isPasswordProtected && (
              <div>
                <Label htmlFor="password" required>
                  Room Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Set meeting password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={isPasswordProtected}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMeetingMutation.isPending}>
              Schedule Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
