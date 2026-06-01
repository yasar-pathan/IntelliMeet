import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '@/features/dashboard/api/dashboardApi';
import { queryKeys } from '@/lib/queryClient';

const DASHBOARD_REFETCH_MS = 20_000;

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard,
    queryFn: fetchDashboardStats,
    staleTime: 0,
    gcTime: 60_000,
    refetchInterval: DASHBOARD_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });
}
