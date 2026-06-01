import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationPanel } from '@/components/feedback/NotificationPanel';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Notification } from '@/types/models';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const socket = useSocket();
  const { unreadCount, setUnreadCount, incrementUnreadCount, setLatestNotification } = useNotificationStore();

  // Fetch unread count
  useQuery<ApiResponse<{ count: number }>>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
      setUnreadCount(response.data.data.count);
      return response.data;
    },
    refetchInterval: 60000, // Poll every minute as fallback
  });

  // Listen for socket events
  React.useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      incrementUnreadCount();
      setLatestNotification(notification);
      toast.info(notification.title, {
        description: notification.message,
        action: {
          label: 'View',
          onClick: () => setIsOpen(true),
        },
      });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, incrementUnreadCount, setLatestNotification]);

  // Click outside listener
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative select-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && <NotificationPanel onClose={() => setIsOpen(false)} />}
    </div>
  );
};
