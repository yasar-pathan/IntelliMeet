import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Check, RefreshCw, Link2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useClipboard } from '@/hooks/useClipboard';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

interface InviteLinkSectionProps {
  teamId: string;
  inviteCode: string;
}

export const InviteLinkSection: React.FC<InviteLinkSectionProps> = ({ teamId, inviteCode }) => {
  const queryClient = useQueryClient();
  const { hasCopied, copy } = useClipboard();

  // Generate new invite code mutation
  const generateInviteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<ApiResponse<{ inviteCode: string; inviteLink: string }>>(
        `/teams/${teamId}/invite`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('New invitation code generated!');
    },
    onError: () => {
      toast.error('Failed to generate invitation');
    },
  });

  const getInviteLink = () => {
    return `${window.location.origin}/teams/join/${inviteCode}`;
  };

  const handleCopyLink = () => {
    copy(getInviteLink());
    toast.success('Workspace join link copied to clipboard!');
  };

  return (
    <div className="space-y-4 text-left select-none">
      <div className="flex items-center gap-1.5 border-b border-border/30 pb-2.5">
        <Link2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Invitations & Entry Codes</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Invite Code Block */}
        <div className="p-4 rounded-xl border border-border bg-card md:col-span-1 flex flex-col justify-between">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Workspace Code
            </label>
            <p className="font-mono text-xl font-black text-foreground mt-2 select-all bg-muted/60 p-2 rounded text-center border border-border/30">
              {inviteCode}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => generateInviteMutation.mutate()}
            isLoading={generateInviteMutation.isPending}
            className="w-full mt-4 gap-1.5 cursor-pointer"
            variant="outline"
          >
            <RefreshCw className="h-3 w-3" /> Roll Code
          </Button>
        </div>

        {/* Invite Link Block */}
        <div className="p-4 rounded-xl border border-border bg-card md:col-span-2 flex flex-col justify-between">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Direct Join Link
            </label>
            <p className="text-xs text-muted-foreground break-all mt-2 select-all bg-muted/30 p-2.5 rounded border border-border/20 font-medium">
              {getInviteLink()}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleCopyLink}
            className="w-full mt-4 gap-1.5 cursor-pointer"
          >
            {hasCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy Invitation Link
          </Button>
        </div>
      </div>
    </div>
  );
};
export default InviteLinkSection;
