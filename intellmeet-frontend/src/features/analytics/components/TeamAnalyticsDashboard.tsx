import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Video, Users, Sparkles, Zap, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/common/Avatar';
import { CHART, MEETING_STATUS_COLORS, TASK_STATUS_COLORS } from '@/features/analytics/components/chartTheme';
import type { TeamAnalytics } from '@/types/models';

interface TeamAnalyticsDashboardProps {
  data: TeamAnalytics;
}

export const TeamAnalyticsDashboard: React.FC<TeamAnalyticsDashboardProps> = ({ data }) => {
  const meetingTrend = data.trends?.meetingsByWeek ?? [];

  const taskBars = [
    { name: 'To Do', value: data.tasks.todo, fill: TASK_STATUS_COLORS.todo },
    { name: 'In Progress', value: data.tasks.inProgress, fill: TASK_STATUS_COLORS['in-progress'] },
    { name: 'Review', value: data.tasks.review, fill: TASK_STATUS_COLORS.review },
    { name: 'Done', value: data.tasks.done, fill: TASK_STATUS_COLORS.done },
    { name: 'Cancelled', value: data.tasks.cancelled, fill: TASK_STATUS_COLORS.cancelled },
  ];

  const meetingPie = Object.entries(data.meetingStatus ?? {}).map(([name, value]) => ({
    name,
    value,
    fill: MEETING_STATUS_COLORS[name] ?? CHART.slate,
  }));

  const totalTasks =
    data.tasks.todo + data.tasks.inProgress + data.tasks.review + data.tasks.done + data.tasks.cancelled;
  const completionRate = totalTasks > 0 ? Math.round((data.tasks.done / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-gradient-to-br from-card to-indigo-500/5">
          <CardContent className="pt-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workspace Index</p>
            <p className="text-3xl font-black mt-1">{data.productivityIndex ?? 0}</p>
            <Zap className="h-5 w-5 text-violet-500 mt-2" />
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Team Meetings</p>
            <p className="text-3xl font-black mt-1">{data.meetings.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Avg {data.meetings.avgDuration}m · {data.meetings.avgParticipants} people</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Task Completion</p>
            <p className="text-3xl font-black mt-1">{completionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{data.tasks.done} of {totalTasks} tasks done</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Outputs</p>
            <p className="text-3xl font-black mt-1">{data.aiUsage.summariesGenerated}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {data.aiUsage.actionItemsExtracted ?? data.aiUsage.actionItemsCreated ?? 0} action items
            </p>
          </CardContent>
        </Card>
      </div>

      {data.insights && data.insights.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Team Intelligence Brief
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {data.insights.map((insight, i) => (
              <p key={i} className="text-sm text-foreground/85 leading-relaxed">
                • {insight}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Team Meeting Activity</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={meetingTrend}>
                <defs>
                  <linearGradient id="teamMeetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART.emerald} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={CHART.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART.axis }} />
                <YAxis tick={{ fontSize: 10, fill: CHART.axis }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="meetings"
                  name="Meetings"
                  stroke={CHART.emerald}
                  fill="url(#teamMeetGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Meeting Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={meetingPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {meetingPie.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Kanban Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskBars} layout="vertical">
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10, fill: CHART.axis }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: CHART.axis }} />
                <Tooltip />
                <Bar dataKey="value" name="Tasks" radius={[0, 4, 4, 0]}>
                  {taskBars.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4" /> Top Contributors
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[280px] overflow-y-auto p-0">
            {data.tasks.topContributors?.length ? (
              data.tasks.topContributors.map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-3 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}</span>
                    <Avatar name={c.user?.name ?? 'User'} src={c.user?.avatar} size="sm" />
                    <span className="text-sm font-semibold truncate">{c.user?.name}</span>
                  </div>
                  <span className="text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0">
                    {c.count} done
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No completed tasks in this period.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {data.meetings.topHosts && data.meetings.topHosts.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Video className="h-4 w-4" /> Top Meeting Hosts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {data.meetings.topHosts.map((host, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/20"
              >
                <Avatar name={host.name} src={host.avatar} size="sm" />
                <div>
                  <p className="text-xs font-bold">{host.name}</p>
                  <p className="text-[10px] text-muted-foreground">{host.count} meetings hosted</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
