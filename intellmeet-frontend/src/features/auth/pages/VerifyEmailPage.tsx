import * as React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useVerifyEmail } from '@/hooks/useAuth';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Button } from '@/components/ui/Button';

export const VerifyEmailPage: React.FC = () => {
  const verifyEmailMutation = useVerifyEmail();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  React.useEffect(() => {
    if (token) {
      setStatus('loading');
      verifyEmailMutation.mutate(token, {
        onError: (error: any) => {
          setStatus('error');
          const message = error.response?.data?.message || 'Email verification failed.';
          toast.error(message);
        },
        onSuccess: () => {
          setStatus('success');
          toast.success('Email successfully verified!');
        },
      });
    }
  }, [token]);

  return (
    <AuthLayout title="Email Verification" subtitle="Verify your account to start using IntellMeet">
      <div className="text-center space-y-4">
        {!token && (
          <div className="space-y-4">
            <p className="text-sm text-destructive font-semibold">
              Verification token is missing or invalid.
            </p>
            <div className="pt-2">
              <Link to="/login" className="font-bold text-primary hover:underline text-sm">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="space-y-2">
            <svg
              className="animate-spin h-8 w-8 text-primary mx-auto"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-xs text-muted-foreground font-semibold">Verifying your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success/15 text-success mx-auto">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your email address has been successfully verified. You can now log into your account.
            </p>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/15 text-destructive mx-auto">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The verification link was invalid, expired, or has already been used. Please request a new verification link.
            </p>
            <div className="pt-2">
              <Link to="/login" className="font-bold text-primary hover:underline text-sm">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
