import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

export interface AiChatMessage {
  _id: string;
  meeting: string;
  user: string;
  question: string;
  answer: string;
  createdAt: string;
}

export function useMeetingAiChatHistory(meetingId: string | undefined) {
  return useQuery<AiChatMessage[]>({
    queryKey: ['meetings', 'ai-chat', meetingId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<AiChatMessage[]>>(`/ai/meeting-chat/${meetingId}`);
      return response.data.data;
    },
    enabled: !!meetingId,
  });
}

export function useAskAiQuestion(meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (question: string) => {
      const response = await api.post<ApiResponse<{ answer: string; chatMessage: AiChatMessage }>>(
        `/ai/meeting-chat/${meetingId}`,
        { question }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<AiChatMessage[]>(['meetings', 'ai-chat', meetingId], (oldData) => {
        if (!oldData) return [data.chatMessage];
        return [...oldData, data.chatMessage];
      });
    },
  });
}
