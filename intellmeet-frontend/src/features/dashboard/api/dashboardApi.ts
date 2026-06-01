import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { PersonalAnalytics } from '@/types/models';

export interface DashboardStats extends PersonalAnalytics {
  teams?: { count: number };
  refreshedAt?: string;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await api.get<ApiResponse<DashboardStats>>('/analytics/dashboard');
  return response.data.data;
}
