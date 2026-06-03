import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryClient';
import { disconnectSocket } from '@/lib/socket';
import type { User } from '@/types/models';
import type { ApiResponse } from '@/types/api';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/login', payload);
      return data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      localStorage.setItem('intellmeet_refresh_token', data.refreshToken);
      navigate('/');
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await api.post<ApiResponse<User>>('/auth/register', payload);
      return data.data;
    },
    onSuccess: () => {
      navigate('/login');
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: () => {
      clearAuth();
      disconnectSocket();
      queryClient.clear();
      navigate('/login');
    },
  });
}

export function useCurrentUser() {
  const { setAuth, setLoading, accessToken } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<User>>('/auth/me');
      return data.data;
    },
    enabled: !!accessToken,
    retry: false,
    staleTime: 60_000,
    meta: {
      onSuccess: (data: User) => {
        setAuth(data, accessToken!);
      },
      onError: () => {
        setLoading(false);
      },
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
      return data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, newPassword, confirmPassword }: { token: string; newPassword: string; confirmPassword: string }) => {
      const { data } = await api.post<ApiResponse<{ message: string }>>(`/auth/reset-password?token=${encodeURIComponent(token)}`, { newPassword, confirmPassword });
      return data;
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data } = await api.post<ApiResponse<{ message: string }>>('/auth/verify-email', { token });
      return data;
    },
  });
}
