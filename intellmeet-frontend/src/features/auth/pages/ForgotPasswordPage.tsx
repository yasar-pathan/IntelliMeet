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
import { Mail } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const forgotPasswordMutation = useForgotPassword();
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState('');

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
        setSubmittedEmail(data.email);
        setIsSubmitted(true);
        toast.success('If an account exists for this email, a reset link has been sent.');
      },
    });
  };

  if (isSubmitted) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent a password reset link to your inbox">
        <div className="text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            We've sent password recovery instructions to:
          </p>
          <p className="font-semibold text-foreground break-all">
            {submittedEmail}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please check your inbox and spam folder. The reset link may take a few minutes to arrive.
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
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                className="pl-12"
                error={!!errors.email}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive mt-1.5">{errors.email.message}</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 rounded-xl font-semibold shadow-lg transition-all hover:scale-[1.02]"
          disabled={forgotPasswordMutation.isPending}
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
