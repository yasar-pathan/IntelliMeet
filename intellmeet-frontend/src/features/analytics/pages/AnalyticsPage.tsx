import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, BarChart3 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { PersonalAnalyticsDashboard } from '@/features/analytics/components/PersonalAnalyticsDashboard';
import { TeamAnalyticsDashboard } from '@/features/analytics/components/TeamAnalyticsDashboard';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Team, PersonalAnalytics, TeamAnalytics } from '@/types/models';
import { cn } from '@/lib/utils';

type RangeDays = 7 | 30 | 90;

function getRangeParams(days: RangeDays) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export const AnalyticsPage: React.FC = () => {
  const [selectedTeamId, setSelectedTeamId] = React.useState('');
  const [rangeDays, setRangeDays] = React.useState<RangeDays>(30);
  const range = getRangeParams(rangeDays);

  const { data: teamsData } = useQuery<ApiResponse<Team[]>>({
    queryKey: ['teams', 'analytics-dropdown'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Team[]>>('/teams');
      return response.data;
    },
  });

  const teams = teamsData?.data || [];

  const { data: personalData, isLoading: personalLoading } = useQuery<ApiResponse<PersonalAnalytics>>({
    queryKey: ['analytics', 'personal', rangeDays],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PersonalAnalytics>>('/analytics/personal', {
        params: range,
      });
      return response.data;
    },
    enabled: !selectedTeamId,
  });

  const { data: teamData, isLoading: teamLoading } = useQuery<ApiResponse<TeamAnalytics>>({
    queryKey: ['analytics', 'team', selectedTeamId, rangeDays],
    queryFn: async () => {
      const response = await api.get<ApiResponse<TeamAnalytics>>(`/analytics/team/${selectedTeamId}`, {
        params: range,
      });
      return response.data;
    },
    enabled: !!selectedTeamId,
  });

  const loading = selectedTeamId ? teamLoading : personalLoading;

  return (
    <PageContainer>
      <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-indigo-500/10 via-card to-emerald-500/5 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Intelligence Center
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Analytics Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Production-grade visibility into meetings, execution velocity, collaboration patterns, and AI-assisted
              outcomes — built for serious engineering intake workflows.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex rounded-lg border border-border/60 p-1 bg-background/60">
              {([7, 30, 90] as RangeDays[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRangeDays(d)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer',
                    rangeDays === d
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>

            <div className="w-full sm:w-56">
              <Label htmlFor="analyticsScope" className="text-[10px] font-bold text-muted-foreground uppercase">
                Scope
              </Label>
              <Select
                id="analyticsScope"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="h-9 text-xs mt-1"
              >
                <option value="">Personal workspace</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[360px] gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Compiling analytics intelligence...</span>
        </div>
      ) : selectedTeamId && teamData?.data ? (
        <TeamAnalyticsDashboard data={teamData.data} />
      ) : personalData?.data ? (
        <PersonalAnalyticsDashboard data={personalData.data} />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-20">No analytics data available for this period.</p>
      )}
    </PageContainer>
  );
};

export default AnalyticsPage;
