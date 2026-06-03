import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { registerSchema, type RegisterInput } from '@/features/auth/schemas/auth.schema';
import { useRegister } from '@/hooks/useAuth';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { User, Mail, Lock, Eye, EyeOff} from "lucide-react";

// const [showPassword, setShowPassword] = React.useState(false);
export const RegisterPage: React.FC = () => {
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterInput) => {
    registerMutation.mutate(data, {
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Registration failed. Please check credentials.';
        toast.error(message);
      },
      onSuccess: () => {
        toast.success('Successfully registered! Please verify your email.');
      },
    });
  };

  return (
    <AuthLayout title="Create an account" subtitle="Sign up for IntellMeet to start collaborating">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
        <div>
          <Label htmlFor="name" required>
            Full Name
          </Label>
          
            
            <div className="mt-1.5">
            <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
              id="name"
              type="text"
              placeholder="John Doe"
              className="pl-12 "
              error={!!errors.name}
              {...register('name')}
            />
            </div>
            {errors.name && (
              <p className="text-xs text-destructive mt-1.5">{errors.name.message}</p>
            )}
          </div>
        </div>

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
              className="pl-12 "
              error={!!errors.email}
              {...register('email')}
            />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive mt-1.5">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="password" required>
            Password
          </Label>
          <div className="mt-1.5">
            <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-12 "
              error={!!errors.password}
              {...register('password')}
              
            />
            
            </div>
            {errors.password && (
              <p className="text-xs text-destructive mt-1.5">{errors.password.message}</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          isLoading={registerMutation.isPending}
        >
          Get Started
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
