import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/features/auth/schemas/auth.schema';
import { useForgotPassword } from '@/hooks/useAuth';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export const ForgotPasswordPage: React.FC = () => {
  const forgotPasswordMutation = useForgotPassword();
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordInput) => {
    forgotPasswordMutation.mutate(data.email, {
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Password reset request failed.';
        toast.error(message);
      },
      onSuccess: () => {
        setIsSubmitted(true);
        toast.success('Password reset link sent to your email.');
      },
    });
  };

  if (isSubmitted) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent a password reset link to your inbox">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please follow the instructions sent to your email address to reset your password. If
            you don't receive it in a few minutes, check your spam folder.
          </p>
          <div className="pt-2">
            <Link to="/login" className="font-bold text-primary hover:underline text-sm">
              Back to Sign In
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot Password?" subtitle="No worries, we'll send you recovery instructions">
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

        <Button
          type="submit"
          className="w-full mt-2"
          isLoading={forgotPasswordMutation.isPending}
        >
          Send Instructions
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Remembered your password?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
