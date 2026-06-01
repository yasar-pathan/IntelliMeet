import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Video, CheckSquare, MessageSquare, Zap, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CHART, MEETING_STATUS_COLORS, TASK_STATUS_COLORS } from '@/features/analytics/components/chartTheme';
import type { PersonalAnalytics } from '@/types/models';

interface PersonalAnalyticsDashboardProps {
  data: PersonalAnalytics;
}

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}> = ({ label, value, sub, icon, accent }) => (
  <Card className="border-border/50 bg-gradient-to-br from-card to-card/60 overflow-hidden relative">
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20" style={{ background: accent }} />
    <CardContent className="pt-5 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="text-3xl font-black text-foreground mt-1 tabular-nums">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl" style={{ background: `${accent}22`, color: accent }}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ChartTooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  },
};

export const PersonalAnalyticsDashboard: React.FC<PersonalAnalyticsDashboardProps> = ({ data }) => {
  const meetingTrend = data.trends?.meetingsByWeek ?? [];
  const taskTrend = data.trends?.tasksByWeek ?? [];

  const taskPie = Object.entries(data.taskStatus ?? {}).map(([name, value]) => ({
    name: name.replace('-', ' '),
    value,
    fill: TASK_STATUS_COLORS[name] ?? CHART.slate,
  }));

  const meetingPie = Object.entries(data.meetingStatus ?? {}).map(([name, value]) => ({
    name,
    value,
    fill: MEETING_STATUS_COLORS[name] ?? CHART.slate,
  }));

  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const found = data.messagesByHour?.find((h) => h.hour === hour);
    return { hour: `${hour}:00`, count: found?.count ?? 0 };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Productivity Index"
          value={data.productivityIndex ?? 0}
          sub="Composite score"
          icon={<Zap className="h-5 w-5" />}
          accent={CHART.violet}
        />
        <KpiCard
          label="Meetings"
          value={data.meetings.total}
          sub={`${data.meetings.hosted} hosted · ${data.meetings.attended} joined`}
          icon={<Video className="h-5 w-5" />}
          accent={CHART.indigo}
        />
        <KpiCard
          label="Task Completion"
          value={`${Math.round(data.tasks.completionRate)}%`}
          sub={`${data.tasks.completed}/${data.tasks.total} done · ${data.tasks.overdue} overdue`}
          icon={<CheckSquare className="h-5 w-5" />}
          accent={CHART.emerald}
        />
        <KpiCard
          label="Collaboration"
          value={data.collaboration.messagesCount}
          sub={`Peak hour ${data.collaboration.mostActiveHour}:00`}
          icon={<MessageSquare className="h-5 w-5" />}
          accent={CHART.cyan}
        />
      </div>

      {data.insights && data.insights.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Executive Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {data.insights.map((insight, i) => (
                <li key={i} className="text-sm text-foreground/85 leading-relaxed flex gap-2">
                  <span className="text-primary font-bold shrink-0">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Meeting Volume & Duration</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={meetingTrend}>
                <defs>
                  <linearGradient id="meetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART.indigo} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={CHART.indigo} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART.axis }} />
                <YAxis tick={{ fontSize: 10, fill: CHART.axis }} />
                <Tooltip {...ChartTooltipStyle} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="meetings"
                  name="Meetings"
                  stroke={CHART.indigo}
                  fill="url(#meetGrad)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  name="Minutes"
                  stroke={CHART.amber}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Meeting Status Mix</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={meetingPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {meetingPie.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip {...ChartTooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Task Throughput</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskTrend}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART.axis }} />
                <YAxis tick={{ fontSize: 10, fill: CHART.axis }} />
                <Tooltip {...ChartTooltipStyle} />
                <Legend />
                <Bar dataKey="created" name="Created" fill={CHART.indigo} radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill={CHART.emerald} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Task Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                  {taskPie.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip {...ChartTooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Collaboration Heatmap (Messages by Hour)</CardTitle>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyData}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: CHART.axis }} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: CHART.axis }} />
              <Tooltip {...ChartTooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                name="Messages"
                stroke={CHART.cyan}
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
