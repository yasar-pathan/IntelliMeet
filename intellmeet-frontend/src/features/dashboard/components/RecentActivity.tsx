import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Loader2,
  Video,
  CheckSquare,
  Users,
  MessageSquare,
  Info,
  Sparkles,
  Film,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/utils';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Notification } from '@/types/models';

interface NotificationsPayload {
  data: Notification[];
  total: number;
}

export const RecentActivity: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<ApiResponse<NotificationsPayload>>({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<NotificationsPayload>>('/notifications', {
        params: { limit: 8 },
      });
      return response.data;
    },
  });

  const notifications = data?.data?.data ?? [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'meeting_invite':
      case 'meeting_started':
        return <Video className="h-3.5 w-3.5 text-blue-500" />;
      case 'task_assigned':
      case 'task_updated':
        return <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />;
      case 'team_invite':
        return <Users className="h-3.5 w-3.5 text-violet-500" />;
      case 'mention':
        return <MessageSquare className="h-3.5 w-3.5 text-orange-500" />;
      case 'ai_summary_ready':
        return <Sparkles className="h-3.5 w-3.5 text-primary" />;
      case 'recording_ready':
        return <Film className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    const meetingId = notification.data?.meetingId as string | undefined;
    if (meetingId && (notification.type === 'ai_summary_ready' || notification.type === 'recording_ready')) {
      navigate(`/meetings/${meetingId}/summary`);
    }
  };

  return (
    <Card className="shadow-sm flex flex-col h-full min-h-[320px] border-border/60">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Recent Activity
          {notifications.length > 0 && (
            <span className="ml-1 text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full normal-case tracking-normal">
              {notifications.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Loading activity feed...</span>
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-border/30">
            {notifications.map((n) => (
              <button
                key={n._id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                className="w-full flex gap-3 p-4 items-start hover:bg-muted/20 transition-colors text-left cursor-pointer"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/60 border border-border/40">
                    {getActivityIcon(n.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[9px] text-muted-foreground/80 mt-1.5 block font-medium">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" title="Unread" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center flex flex-col items-center justify-center min-h-[220px]">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Activity className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-bold text-foreground">All caught up</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
              Task assignments, meeting invites, AI summaries, and recordings will appear here.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 cursor-pointer"
              onClick={() => navigate('/meetings')}
            >
              Browse meetings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
