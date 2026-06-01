import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Loader2, Video, CheckSquare, Users, AlertCircle, Info } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import api from '@/lib/axios';
import { useNotificationStore } from '@/stores/notificationStore';
import type { ApiResponse } from '@/types/api';
import type { Notification } from '@/types/models';
import { cn } from '@/lib/utils';

export interface NotificationPanelProps {
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { setUnreadCount } = useNotificationStore();

  // Fetch notifications
  const { data, isLoading } = useQuery<ApiResponse<{ notifications: Notification[]; total: number }>>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ notifications: Notification[]; total: number }>>('/notifications');
      return response.data;
    },
  });

  const notifications = data?.data?.notifications || [];

  // Mark all read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      setUnreadCount(0);
    },
  });

  // Mark single read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meeting_invite':
      case 'meeting_started':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'task_assigned':
      case 'task_updated':
        return <CheckSquare className="h-4 w-4 text-green-500" />;
      case 'team_invite':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'mention':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[480px] animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-foreground" />
          <span className="font-bold text-sm text-foreground">Notifications</span>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-border/30">
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.isRead && markReadMutation.mutate(n._id)}
                className={cn(
                  'flex gap-3 p-4 text-left transition-colors cursor-pointer',
                  {
                    'bg-muted/30 hover:bg-muted/60': !n.isRead,
                    'hover:bg-muted/10 opacity-70': n.isRead,
                  }
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/60">
                    {getNotificationIcon(n.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5 gap-2">
                    <span className="text-xs font-bold text-foreground truncate">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</p>
                </div>
                {!n.isRead && (
                  <div className="flex-shrink-0 flex items-center">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <span>You're all caught up ✨</span>
          </div>
        )}
      </div>
    </div>
  );
};
