import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, CheckCircle2, Video, MessageSquare, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats';

const chartTooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  },
};

export const ProductivitySnapshot: React.FC = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading, isFetching } = useDashboardStats();

  if (isLoading && !stats) {
    return (
      <Card className="shadow-sm h-full min-h-[320px] flex flex-col justify-center items-center border-border/60">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground mt-2 font-semibold">Loading analytics...</span>
      </Card>
    );
  }

  const completionRate = Math.round(stats?.tasks?.completionRate || 0);
  const meetingTrend = (stats?.trends?.meetingsByWeek ?? []).slice(-7).map((point) => ({
    label: point.label?.slice(5) ?? point.label,
    meetings: point.meetings ?? 0,
  }));

  const taskStatusEntries = Object.entries(stats?.taskStatus ?? {}).map(([name, value]) => ({
    name: name.replace('-', ' '),
    count: value,
  }));

  return (
    <Card className="shadow-sm flex flex-col h-full min-h-[320px] border-border/60">
      <CardHeader className="pb-3 border-b border-border/30 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Productivity Snapshot
          {isFetching && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </CardTitle>
        <button
          type="button"
          onClick={() => navigate('/analytics')}
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
        >
          Details <ArrowRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-xl bg-blue-500/8 border border-blue-500/15">
            <Video className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-black text-foreground leading-none tabular-nums">
              {stats?.meetings?.total || 0}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">Meetings</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-xl font-black text-foreground leading-none tabular-nums">
              {stats?.tasks?.completed || 0}/{stats?.tasks?.total || 0}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">Tasks</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-violet-500/8 border border-violet-500/15">
            <MessageSquare className="h-4 w-4 text-violet-500 mx-auto mb-1" />
            <p className="text-xl font-black text-foreground leading-none tabular-nums">
              {stats?.collaboration?.messagesCount || 0}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">Messages</p>
          </div>
        </div>

        {meetingTrend.length > 0 ? (
          <div className="rounded-xl border border-border/40 bg-muted/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 text-left">
              Meeting activity (7 days)
            </p>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={meetingTrend}>
                <defs>
                  <linearGradient id="meetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 9 }} width={20} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={chartTooltipStyle.contentStyle} />
                <Area
                  type="monotone"
                  dataKey="meetings"
                  stroke="hsl(var(--primary))"
                  fill="url(#meetGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">Meeting trend chart appears after more activity.</p>
          </div>
        )}

        <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card gap-4">
          <div className="text-left min-w-0">
            <p className="text-sm font-bold text-foreground">Task completion</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {completionRate}% across your active board
            </p>
          </div>
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="4" className="text-muted/50" fill="transparent" />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="4"
                className="text-primary transition-all duration-500"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 22}
                strokeDashoffset={2 * Math.PI * 22 * (1 - completionRate / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-black">{completionRate}%</span>
          </div>
        </div>

        {taskStatusEntries.length > 0 && (
          <div className="rounded-xl border border-border/40 bg-muted/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 text-left">
              Task board breakdown
            </p>
            <ResponsiveContainer width="100%" height={72}>
              <BarChart data={taskStatusEntries} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={chartTooltipStyle.contentStyle} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductivitySnapshot;
