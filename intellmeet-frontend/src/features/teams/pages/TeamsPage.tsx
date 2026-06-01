import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Users, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { TeamCard } from '@/features/teams/components/TeamCard';
import { CreateTeamDialog } from '@/features/teams/components/CreateTeamDialog';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Team } from '@/types/models';

export const TeamsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState('');

  // Fetch workspaces
  const { data, isLoading } = useQuery<ApiResponse<Team[]>>({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Team[]>>('/teams');
      return response.data;
    },
  });

  const teams = data?.data || [];

  // Join workspace mutation
  const joinTeamMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post(`/teams/join/${code}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Joined workspace successfully!');
      setJoinCode('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to join workspace. Code may be invalid.');
    },
  });

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    joinTeamMutation.mutate(joinCode.trim());
  };

  return (
    <PageContainer>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Setup collaborative rooms and share resources across multiple team spaces.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-1.5 cursor-pointer">
          <Plus className="h-4 w-4" /> Create Workspace
        </Button>
      </div>

      {/* Join Workspace Widget */}
      <div className="p-4 bg-card border border-border rounded-xl mb-6 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between select-none">
        <div className="text-left sm:flex-1">
          <h3 className="text-sm font-bold text-foreground">Have an invitation code?</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Input a teammate's invite code to enter their active workspace.
          </p>
        </div>
        <form onSubmit={handleJoinSubmit} className="flex gap-2 w-full sm:w-auto shrink-0 items-center">
          <Input
            placeholder="Invite code (e.g. abcd12)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="h-9 text-xs sm:w-48 bg-background"
            required
          />
          <Button
            type="submit"
            size="sm"
            isLoading={joinTeamMutation.isPending}
            className="cursor-pointer gap-1"
          >
            Join <ArrowRight className="h-3 w-3" />
          </Button>
        </form>
      </div>

      {/* Workspaces Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard
              key={team._id}
              team={team}
              onManageClick={() => navigate(`/teams/${team._id}`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No workspaces active"
          description="Create a team workspace or join an existing one using an invite code."
          icon={<Users className="h-6 w-6" />}
          action={
            <Button onClick={() => setCreateDialogOpen(true)} variant="primary">
              Create your first team workspace
            </Button>
          }
        />
      )}

      {/* Creation Modal */}
      <CreateTeamDialog isOpen={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
    </PageContainer>
  );
};

export default TeamsPage;
