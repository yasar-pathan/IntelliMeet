import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

interface JoinMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  isLoading?: boolean;
}

export const JoinMeetingDialog: React.FC<JoinMeetingDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [password, setPassword] = React.useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    onSubmit(password);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent onClose={onClose}>
        <form onSubmit={handleFormSubmit}>
          <DialogHeader>
            <DialogTitle>Enter Meeting Password</DialogTitle>
            <DialogDescription>
              This meeting room is password-protected. Please enter the password to join.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 text-left">
            <Label htmlFor="roomPassword" required>
              Room Password
            </Label>
            <Input
              id="roomPassword"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Join Session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
