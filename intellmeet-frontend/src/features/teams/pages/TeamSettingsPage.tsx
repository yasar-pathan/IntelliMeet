import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save, Trash2, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { MemberList } from '@/features/teams/components/MemberList';
import { InviteLinkSection } from '@/features/teams/components/InviteLinkSection';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Team } from '@/types/models';

export const TeamSettingsPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  // Fetch team details
  const { data, isLoading } = useQuery<ApiResponse<{ team: Team; recentMeetings: any[] }>>({
    queryKey: ['teams', 'detail', teamId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ team: Team; recentMeetings: any[] }>>(`/teams/${teamId}`);
      return response.data;
    },
    enabled: !!teamId,
  });

  const team = data?.data?.team;
  const isOwner = team && (typeof team.owner === 'string' ? team.owner === currentUser?._id : team.owner._id === currentUser?._id);

  React.useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || '');
    }
  }, [team]);

  // Update workspace mutation
  const updateTeamMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/teams/${teamId}`, { name, description });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Workspace details updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update workspace details');
    },
  });

  // Delete workspace mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Workspace deleted permanently');
      setDeleteConfirmOpen(false);
      navigate('/teams');
    },
    onError: () => {
      toast.error('Failed to delete workspace');
    },
  });

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateTeamMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground mt-3 font-semibold">Loading workspace settings...</span>
      </div>
    );
  }

  if (!team) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-sm text-destructive font-semibold">Workspace not found</p>
          <Button onClick={() => navigate('/teams')} variant="outline" className="mt-4">
            Back to Workspaces
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Top back button navigation */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate('/teams')}
          className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground font-semibold">Back to workspaces list</span>
      </div>

      <div className="text-left mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{team.name} Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure invitation entry parameters, member assignments, and workspace identity.
        </p>
      </div>

      {/* Main Settings Form Blocks */}
      <div className="space-y-6">
        {/* Workspace Identity Details */}
        <Card className="text-left">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Workspace Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <Label htmlFor="teamName" required>
                  Workspace Name
                </Label>
                <div className="mt-1.5">
                  <Input
                    id="teamName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={!isOwner}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="teamDesc">Description</Label>
                <div className="mt-1.5">
                  <Textarea
                    id="teamDesc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
              </div>

              {isOwner && (
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    isLoading={updateTeamMutation.isPending}
                    className="gap-1.5 cursor-pointer"
                  >
                    <Save className="h-4 w-4" /> Save Changes
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Invitations details */}
        <Card className="p-5">
          <InviteLinkSection teamId={team._id} inviteCode={team.inviteCode} />
        </Card>

        {/* Members details list */}
        <Card className="p-5">
          <MemberList
            teamId={team._id}
            members={team.members || []}
            ownerId={typeof team.owner === 'string' ? team.owner : team.owner._id}
          />
        </Card>

        {/* Danger Zone for workspace deletion (Owners only) */}
        {isOwner && (
          <Card className="border-destructive/40 bg-destructive/5 text-left">
            <CardHeader className="pb-3 border-b border-destructive/25">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-foreground">Delete Workspace permanently</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-lg leading-relaxed">
                  Deleting this workspace will immediately revoke access for all members, dissolve
                  invitations, and purge workspace-specific records. This action cannot be reversed.
                </p>
              </div>
              <Button
                variant="danger"
                onClick={() => setDeleteConfirmOpen(true)}
                className="gap-1.5 cursor-pointer shrink-0 self-start sm:self-center"
              >
                <Trash2 className="h-4 w-4" /> Delete Workspace
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => deleteTeamMutation.mutate()}
        title="Delete Workspace permanently?"
        description="Are you sure you want to delete this team workspace? All member access will be revoked."
        isLoading={deleteTeamMutation.isPending}
      />
    </PageContainer>
  );
};

export default TeamSettingsPage;
