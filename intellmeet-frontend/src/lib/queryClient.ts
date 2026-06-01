import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30 seconds
      gcTime: 300_000,          // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ── Query Key Factory ─────────────────────────────────────────────
import type { MeetingFilters, TaskFilters, DateRange } from '@/types/api';

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  meetings: {
    all: ['meetings'] as const,
    list: (filters: MeetingFilters) => ['meetings', 'list', filters] as const,
    detail: (id: string) => ['meetings', 'detail', id] as const,
    summary: (id: string) => ['meetings', 'summary', id] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (filters: TaskFilters) => ['tasks', 'list', filters] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },
  teams: {
    all: ['teams'] as const,
    detail: (id: string) => ['teams', 'detail', id] as const,
  },
  users: {
    search: (query: string) => ['users', 'search', query] as const,
    profile: (id: string) => ['users', 'profile', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  analytics: {
    dashboard: ['analytics', 'dashboard'] as const,
    personal: (range: DateRange) => ['analytics', 'personal', range] as const,
    team: (teamId: string, range: DateRange) => ['analytics', 'team', teamId, range] as const,
    meeting: (meetingId: string) => ['analytics', 'meeting', meetingId] as const,
  },
} as const;

/** Refetch dashboard KPI cards after meetings, tasks, or teams change. */
export function invalidateDashboardStats(queryClient: import('@tanstack/react-query').QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.analytics.dashboard });
}
