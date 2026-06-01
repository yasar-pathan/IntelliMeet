import { create } from 'zustand';
import type { User } from '@/types/models';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  updateUser: (partial: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) =>
    set({
      user,
      accessToken: token,
      isAuthenticated: true,
      isLoading: false,
    }),

  setUser: (user) =>
    set({ user, isAuthenticated: true, isLoading: false }),

  clearAuth: () => {
    localStorage.removeItem('intellmeet_refresh_token');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
