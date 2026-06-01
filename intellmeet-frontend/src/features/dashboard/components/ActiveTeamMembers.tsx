import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, UserPlus, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/common/Avatar';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Team, User } from '@/types/models';

interface ActiveTeamMembersProps {
  onCreateTeam?: () => void;
}

export const ActiveTeamMembers: React.FC<ActiveTeamMembersProps> = ({ onCreateTeam }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const { data: teamsData, isLoading } = useQuery<ApiResponse<Team[]>>({
    queryKey: ['teams', 'members-list'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Team[]>>('/teams');
      return response.data;
    },
  });

  const teams = teamsData?.data || [];

  const membersMap = new Map<string, User>();
  teams.forEach((team) => {
    team.members.forEach((member) => {
      const u = member.user as User;
      if (u && u._id !== currentUser?._id) {
        membersMap.set(u._id, u);
      }
    });
  });

  const members = Array.from(membersMap.values());
  const onlineCount = members.filter((m) => m.isOnline).length;

  return (
    <Card className="shadow-sm flex flex-col h-full min-h-[320px] border-border/60">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Team & Presence
          {members.length > 0 && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full normal-case tracking-normal">
              {onlineCount} online
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Loading workspaces...</span>
          </div>
        ) : teams.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center min-h-[220px]">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
              <Building2 className="h-7 w-7 text-violet-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No workspaces yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
              Create a team to collaborate on meetings, tasks, and Kanban boards together.
            </p>
            {onCreateTeam && (
              <Button onClick={onCreateTeam} size="sm" className="mt-4 gap-1.5 cursor-pointer">
                <UserPlus className="h-3.5 w-3.5" /> Create workspace
              </Button>
            )}
          </div>
        ) : members.length > 0 ? (
          <div className="divide-y divide-border/30">
            {members.slice(0, 8).map((m) => (
              <div
                key={m._id}
                className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={m.name} src={m.avatar} size="sm" isOnline={m.isOnline} />
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    m.isOnline
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {m.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 space-y-3">
            <p className="text-xs text-muted-foreground text-left px-1">
              You have {teams.length} workspace{teams.length !== 1 ? 's' : ''}. Invite teammates to see presence here.
            </p>
            {teams.slice(0, 3).map((team) => (
              <button
                key={team._id}
                type="button"
                onClick={() => navigate(`/teams/${team._id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-colors text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{team.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 cursor-pointer gap-1.5"
              onClick={() => navigate('/teams')}
            >
              Manage teams
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveTeamMembers;
