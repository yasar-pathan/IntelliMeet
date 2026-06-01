import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { deleteMeetingPermanently } from '@/features/meetings/api/meetingsApi';
import { invalidateDashboardStats } from '@/lib/queryClient';

interface DeleteMeetingButtonProps {
  meetingId: string;
  meetingTitle: string;
  hasRecording?: boolean;
  variant?: 'default' | 'destructive-outline';
  onDeleted?: () => void;
}

export const DeleteMeetingButton: React.FC<DeleteMeetingButtonProps> = ({
  meetingId,
  meetingTitle,
  hasRecording = false,
  variant = 'destructive-outline',
  onDeleted,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteMeetingPermanently(meetingId),
    onSuccess: () => {
      toast.success('Meeting deleted permanently');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      invalidateDashboardStats(queryClient);
      setOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        navigate('/meetings');
      }
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to delete meeting');
    },
  });

  return (
    <>
      <Button
        type="button"
        variant={variant === 'destructive-outline' ? 'outline' : 'danger'}
        size="sm"
        className="gap-1.5 cursor-pointer text-destructive border-destructive/40 hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

      <Dialog isOpen={open} onClose={() => !deleteMutation.isPending && setOpen(false)}>
        <DialogContent onClose={() => !deleteMutation.isPending && setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Delete meeting permanently?</DialogTitle>
            <DialogDescription>
              This removes &quot;{meetingTitle}&quot; from your history
              {hasRecording ? ', including its recording file' : ''}, transcript, and AI notes.
              Only you as the host can do this. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="gap-1.5"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteMeetingButton;
