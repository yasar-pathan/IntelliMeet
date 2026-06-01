import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AppShell } from '@/components/layout/AppShell';

// Lazy load feature pages
const LoginPage = React.lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const VerifyEmailPage = React.lazy(() => import('@/features/auth/pages/VerifyEmailPage'));

const DashboardPage = React.lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const MeetingsListPage = React.lazy(() => import('@/features/meetings/pages/MeetingsListPage'));
const MeetingRoomPage = React.lazy(() => import('@/features/meetings/pages/MeetingRoomPage'));
const MeetingSummaryPage = React.lazy(() => import('@/features/meetings/pages/MeetingSummaryPage'));
const TasksPage = React.lazy(() => import('@/features/tasks/pages/TasksPage'));
const TeamsPage = React.lazy(() => import('@/features/teams/pages/TeamsPage'));
const TeamSettingsPage = React.lazy(() => import('@/features/teams/pages/TeamSettingsPage'));
const AnalyticsPage = React.lazy(() => import('@/features/analytics/pages/AnalyticsPage'));
const SettingsPage = React.lazy(() => import('@/features/settings/pages/SettingsPage'));

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Guard (Redirects to Dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen bg-background">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/verify-email" element={<PublicRoute><VerifyEmailPage /></PublicRoute>} />

          {/* Protected Application Routes under AppShell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="meetings" element={<MeetingsListPage />} />
            <Route path="meetings/:meetingId/summary" element={<MeetingSummaryPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/:teamId" element={<TeamSettingsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Full Screen Live Meeting Room */}
          <Route
            path="/meeting/:meetingCode"
            element={
              <ProtectedRoute>
                <MeetingRoomPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
};
