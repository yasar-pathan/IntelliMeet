import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Shield, ShieldAlert, UserMinus, ShieldCheck, Loader2 } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import type { TeamMember, User } from '@/types/models';

interface MemberListProps {
  teamId: string;
  members: TeamMember[];
  ownerId: string;
}

export const MemberList: React.FC<MemberListProps> = ({ teamId, members, ownerId }) => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [kickTarget, setKickTarget] = React.useState<User | null>(null);

  // Check if current user is owner or admin in this team
  const currentUserRole = React.useMemo(() => {
    if (currentUser?._id === ownerId) return 'owner';
    const match = members.find((m) => (typeof m.user === 'string' ? m.user === currentUser?._id : m.user._id === currentUser?._id));
    return match ? match.role : 'member';
  }, [currentUser, members, ownerId]);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  // Role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.patch(`/teams/${teamId}/members/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Member role updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update member role');
    },
  });

  // Kick mutation
  const kickMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/teams/${teamId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Member removed from workspace');
      setKickTarget(null);
    },
    onError: () => {
      toast.error('Failed to remove member');
    },
  });

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <ShieldAlert className="h-3.5 w-3.5 text-destructive" />;
    if (role === 'admin') return <ShieldCheck className="h-3.5 w-3.5 text-primary" />;
    return <Shield className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  return (
    <div className="space-y-4 text-left select-none">
      <div className="flex items-center gap-1.5 border-b border-border/30 pb-2.5">
        <span className="text-sm font-bold text-foreground">Workspace Members</span>
      </div>

      <div className="divide-y divide-border/30">
        {members.map((member) => {
          const u = typeof member.user === 'string' ? null : (member.user as User);
          if (!u) return null;

          const isOwner = u._id === ownerId;
          const isMe = u._id === currentUser?._id;
          
          // Cannot modify own role, owner's role, or admins if user is just admin
          const cannotModify =
            isMe ||
            isOwner ||
            !canManage ||
            (currentUserRole === 'admin' && member.role === 'admin');

          return (
            <div key={u._id} className="flex items-center justify-between py-3.5 hover:bg-muted/10 px-2 rounded-lg transition-colors">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <Avatar name={u.name} src={u.avatar} size="sm" isOnline={u.isOnline} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{u.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Role badges/selectors */}
                {cannotModify ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-muted text-muted-foreground border border-border/30 px-2 py-0.5 rounded-full capitalize">
                    {getRoleIcon(isOwner ? 'owner' : member.role)}
                    {isOwner ? 'owner' : member.role}
                  </span>
                ) : (
                  <Select
                    value={member.role}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    className="h-8 py-0 px-2 text-xs w-28"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </Select>
                )}

                {/* Kick Button */}
                {!isMe && !isOwner && canManage && (currentUserRole === 'owner' || member.role !== 'admin') && (
                  <button
                    onClick={() => setKickTarget(u)}
                    className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-destructive transition-colors cursor-pointer"
                    title="Remove member"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Kick warning dialog */}
      <ConfirmDialog
        isOpen={!!kickTarget}
        onClose={() => setKickTarget(null)}
        onConfirm={() => kickTarget && kickMemberMutation.mutate(kickTarget._id)}
        title="Remove Member?"
        description={`Are you sure you want to remove ${kickTarget?.name} from this workspace?`}
        confirmText="Remove Member"
        isLoading={kickMemberMutation.isPending}
      />
    </div>
  );
};
export default MemberList;
