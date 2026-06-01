import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Meeting } from '@/types/models';

export interface MeetingsListResult {
  meetings: Meeting[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

interface MeetingsListPayload {
  data: Meeting[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

export async function fetchMeetings(params?: {
  status?: string;
  limit?: number;
  page?: number;
}): Promise<MeetingsListResult> {
  const response = await api.get<ApiResponse<MeetingsListPayload>>('/meetings', {
    params: {
      limit: params?.limit ?? 20,
      page: params?.page ?? 1,
      status: params?.status || undefined,
    },
  });

  const payload = response.data.data;
  return {
    meetings: payload.data ?? [],
    total: payload.total ?? 0,
    page: payload.page ?? 1,
    totalPages: payload.totalPages ?? 0,
    hasNextPage: payload.hasNextPage ?? false,
  };
}

export async function deleteMeetingPermanently(meetingId: string): Promise<void> {
  await api.delete(`/meetings/${meetingId}`);
}

export function getMeetingHostId(meeting: Meeting): string | null {
  if (!meeting.host) return null;
  return typeof meeting.host === 'string' ? meeting.host : meeting.host._id;
}
