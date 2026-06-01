import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { loginSchema, type LoginInput } from '@/features/auth/schemas/auth.schema';
import { useLogin } from '@/hooks/useAuth';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export const LoginPage: React.FC = () => {
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data, {
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Login failed. Please check credentials.';
        toast.error(message);
      },
      onSuccess: () => {
        toast.success('Successfully logged in!');
      },
    });
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account to continue">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
        <div>
          <Label htmlFor="email" required>
            Email Address
          </Label>
          <div className="mt-1.5">
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              error={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1.5">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password" required>
              Password
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs font-bold text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
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
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          isLoading={loginMutation.isPending}
        >
          Sign In
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
