import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Message } from '@/types/models';

export function useChatSocket(meetingId: string, meetingCode: string) {
  const socket = useSocket();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = React.useState<Array<{ userId: string; name: string }>>([]);

  // Query message history
  const { isLoading } = useQuery<ApiResponse<Message[]>>({
    queryKey: ['chat', 'history', meetingId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Message[]>>(`/chat/meetings/${meetingId}`);
      setMessages(response.data.data);
      return response.data;
    },
    enabled: !!meetingId,
  });

  // Track socket listeners
  React.useEffect(() => {
    if (!socket || !meetingId) return;

    // 1. Listen for new incoming messages
    const handleNewMessage = (msg: Message) => {
      if (msg.meeting === meetingId) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    // 2. Listen for message confirmation (our own message)
    const handleMessageSent = (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    // 3. Listen for typing indicators
    const handleTypingStart = ({ userId, name }: { userId: string; name: string; avatar: string }) => {
      if (userId !== user?._id) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === userId)) return prev;
          return [...prev, { userId, name }];
        });
      }
    };

    const handleTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    socket.on('chat:new-message', handleNewMessage);
    socket.on('chat:message-sent', handleMessageSent);
    socket.on('chat:typing-start', handleTypingStart);
    socket.on('chat:typing-stop', handleTypingStop);

    return () => {
      socket.off('chat:new-message', handleNewMessage);
      socket.off('chat:message-sent', handleMessageSent);
      socket.off('chat:typing-start', handleTypingStart);
      socket.off('chat:typing-stop', handleTypingStop);
    };
  }, [socket, meetingId, user]);

  // Actions
  const sendMessage = React.useCallback(
    (content: string) => {
      if (!socket || !content.trim()) return;
      socket.emit('chat:send-message', {
        meetingId,
        content,
      });
    },
    [socket, meetingId]
  );

  const startTyping = React.useCallback(() => {
    if (!socket || !meetingCode) return;
    socket.emit('chat:typing-start', { meetingCode });
  }, [socket, meetingCode]);

  const stopTyping = React.useCallback(() => {
    if (!socket || !meetingCode) return;
    socket.emit('chat:typing-stop', { meetingCode });
  }, [socket, meetingCode]);

  return {
    messages,
    typingUsers,
    isLoading,
    sendMessage,
    startTyping,
    stopTyping,
  };
}
export default useChatSocket;
