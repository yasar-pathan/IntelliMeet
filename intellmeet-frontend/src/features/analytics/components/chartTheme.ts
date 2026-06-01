export const CHART = {
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  slate: '#94a3b8',
  grid: 'rgba(148, 163, 184, 0.15)',
  axis: '#64748b',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  todo: CHART.slate,
  'in-progress': CHART.indigo,
  review: CHART.violet,
  done: CHART.emerald,
  cancelled: CHART.rose,
};

export const MEETING_STATUS_COLORS: Record<string, string> = {
  scheduled: CHART.cyan,
  live: CHART.emerald,
  ended: CHART.indigo,
  cancelled: CHART.rose,
};
