import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  CheckSquare,
  Users,
  Sparkles,
  TrendingUp,
  ArrowRight,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats';

interface DashboardHeroProps {
  userName?: string;
  greeting: string;
  onNewMeeting: () => void;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  userName,
  greeting,
  onNewMeeting,
}) => {
  const navigate = useNavigate();
  const { data: stats, isLoading, isFetching, dataUpdatedAt } = useDashboardStats();

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const teamCount = stats?.teams?.count ?? 0;
  const productivityIndex = stats?.productivityIndex ?? 0;
  const insight = stats?.insights?.[0];

  const kpis = [
    {
      label: 'Meetings',
      value: stats?.meetings?.total ?? 0,
      sub: `${stats?.meetings?.hosted ?? 0} hosted · 30 days`,
      icon: Video,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Tasks done',
      value: `${stats?.tasks?.completed ?? 0}/${stats?.tasks?.total ?? 0}`,
      sub: `${Math.round(stats?.tasks?.completionRate ?? 0)}% completion`,
      icon: CheckSquare,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Workspaces',
      value: teamCount,
      sub: teamCount === 1 ? '1 team' : `${teamCount} teams`,
      icon: Users,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Productivity',
      value: `${productivityIndex}`,
      sub: '30-day index',
      icon: TrendingUp,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ];

  const lastUpdated =
    dataUpdatedAt > 0
      ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
          new Date(dataUpdatedAt)
        )
      : null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/8 via-card to-violet-500/5 p-6 md:p-8 mb-6 shadow-sm">
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="text-left max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
              <CalendarDays className="h-3.5 w-3.5" />
              {today}
            </div>
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                {isFetching && !isLoading && (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" aria-hidden />
                )}
                Updated {lastUpdated}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            {greeting}, {userName || 'there'}!
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Your collaboration command center — meetings, tasks, and team activity in one place.
          </p>

          {insight && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/50 bg-background/70 px-4 py-3 text-left">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{insight}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-5">
            <Button onClick={onNewMeeting} className="gap-1.5 cursor-pointer">
              <Video className="h-4 w-4" /> Start meeting
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/analytics')}
              className="gap-1.5 cursor-pointer"
            >
              View analytics <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full lg:w-[420px] shrink-0">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 text-left shadow-sm relative"
              >
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </p>
                  <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-black text-foreground mt-2 tabular-nums">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">{kpi.sub}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DashboardHero;
