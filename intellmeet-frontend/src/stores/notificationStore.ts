import { create } from 'zustand';
import type { Notification } from '@/types/models';

interface NotificationState {
  unreadCount: number;
  latestNotification: Notification | null;

  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  setLatestNotification: (notification: Notification) => void;
  resetNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  latestNotification: null,

  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnreadCount: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnreadCount: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  setLatestNotification: (notification) =>
    set({ latestNotification: notification }),
  resetNotifications: () =>
    set({ unreadCount: 0, latestNotification: null }),
}));
