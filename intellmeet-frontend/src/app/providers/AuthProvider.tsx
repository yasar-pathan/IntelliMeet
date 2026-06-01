import * as React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { User } from '@/types/models';

interface AuthProviderProps {
  children: React.ReactNode;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { setAuth, clearAuth, isLoading, setLoading } = useAuthStore();
  const initStartedRef = React.useRef(false);

  React.useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const initAuth = async () => {
      const refreshToken = localStorage.getItem('intellmeet_refresh_token');

      if (!refreshToken) {
        clearAuth();
        setLoading(false);
        return;
      }

      try {
        // Attempt silent token refresh
        const { data: refreshRes } = await api.post<ApiResponse<RefreshResponse>>(
          '/auth/refresh-token',
          { refreshToken }
        );
        
        const { accessToken, refreshToken: newRefreshToken, user } = refreshRes.data;

        // Save new refresh token and set memory store
        localStorage.setItem('intellmeet_refresh_token', newRefreshToken);
        setAuth(user, accessToken);
      } catch (error) {
        console.error('Initial silent auth refresh failed:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [setAuth, clearAuth, setLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-muted-foreground font-semibold">Initializing session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
