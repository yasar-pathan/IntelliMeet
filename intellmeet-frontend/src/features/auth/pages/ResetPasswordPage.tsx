import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/schemas/auth.schema';
import { useResetPassword } from '@/hooks/useAuth';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {Lock, Eye, EyeOff } from "lucide-react";

 
export const ResetPasswordPage: React.FC = () => {
  const resetPasswordMutation = useResetPassword();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = React.useState(false);
const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = (data: ResetPasswordInput) => {
    if (!token) {
      toast.error('Reset token is missing or invalid.');
      return;
    }

    resetPasswordMutation.mutate(
      { token, newPassword: data.password },
      {
        onError: (error: any) => {
          const message = error.response?.data?.message || 'Failed to reset password.';
          toast.error(message);
        },
        onSuccess: () => {
          toast.success('Password successfully reset! Please sign in with your new password.');
          navigate('/login');
        },
      }
    );
  };

  return (
    <AuthLayout title="Reset Password" subtitle="Choose a strong, secure password for your account">
      {!token ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive font-semibold">
            Invalid reset password link. Token is missing.
          </p>
          <div>
            <Link to="/login" className="font-bold text-primary hover:underline text-sm">
              Back to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
          {/* <div>
            <Label htmlFor="password" required>
              New Password
            </Label>
            <div className="mt-1.5">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                error={!!errors.password}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1.5">{errors.password.message}</p>
              )}
            </div>
          </div> */}
          <div className="relative">
  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

  <Input
    id="password"
    type={showPassword ? "text" : "password"}
    placeholder="••••••••"
    className="pl-10 pr-10 h-12 rounded-xl"
    error={!!errors.password}
    {...register('password')}
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
  >
    {showPassword ? (
      <EyeOff className="h-4 w-4" />
    ) : (
      <Eye className="h-4 w-4" />
    )}
  </button>
</div>
          <div>
            <Label htmlFor="confirmPassword" required>
              Confirm Password
            </Label>
            <div className="mt-1.5">
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                error={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive mt-1.5">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={resetPasswordMutation.isPending}
          >
            Reset Password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPasswordPage;
