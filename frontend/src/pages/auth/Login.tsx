import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Button, Input } from '../../components/common/UI.js';
import { axiosInstance } from '../../api/axios.js';
import { CheckSquare, Facebook, Chrome } from 'lucide-react';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login, loginSocial } = useAuth();
  const navigate = navigateFn();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showResendBtn, setShowResendBtn] = useState(false);
  const [resendEmail, setResendEmail] = useState('');

  function navigateFn() {
    return useNavigate();
  }

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { accessToken, user: userPayload } = event.data;
        loginSocial(accessToken, userPayload);
        toast.success(`Welcome back, ${userPayload.fullName}!`);
        const targetPath = (location.state as any)?.from?.pathname || '/';
        navigate(targetPath, { replace: true });
      } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
        toast.error(event.data.message || 'OAuth authentication failed');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loginSocial, navigate, location]);

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      const currentOrigin = window.location.origin;
      const response = await axiosInstance.get(`/auth/${provider}/url`, {
        params: { origin: currentOrigin }
      });
      
      if (!response.data || !response.data.url) {
        throw new Error('Failed to fetch authorization URL');
      }

      const authUrl = response.data.url;

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        authUrl,
        `oauth_${provider}`,
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
      );

      if (!popup) {
        toast.error('Popup blocked! Please allow popups for this site to log in.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || `Failed to initiate ${provider} login`);
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setShowResendBtn(false);
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.fullName}!`);
      
      const origin = (location.state as any)?.from?.pathname || '/';
      navigate(origin, { replace: true });
    } catch (err: any) {
      const isNotVerified = err.response?.data?.code === 'EMAIL_NOT_VERIFIED';
      if (isNotVerified) {
        setShowResendBtn(true);
        setResendEmail(values.email);
        toast.error('Your email has not been verified yet. Check your inbox or click below to resend.');
      } else {
        toast.error(err.response?.data?.message || err.message || 'Failed to authenticate');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await axiosInstance.post('/auth/resend-verification', { email: resendEmail });
      toast.success('Verification email resent. Please check your inbox.');
      setShowResendBtn(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend verification link');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-slate-100 p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-md shadow-blue-500/15">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-2xl text-slate-900 tracking-tight">Sign In to TaskFlow Pro</h2>
          <p className="font-sans text-xs text-slate-500 mt-1">Enterprise task management and team sync</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex items-center justify-end text-xs">
            <Link to="/forgot-password" className="font-sans font-medium text-blue-600 hover:text-blue-800 transition-colors">
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>

          {showResendBtn && (
            <Button
              type="button"
              variant="secondary"
              className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={handleResend}
            >
              Resend Verification Email
            </Button>
          )}
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors font-sans text-sm font-medium shadow-sm cursor-pointer"
          >
            <Chrome className="w-4 h-4 text-red-500" />
            Google
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('facebook')}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors font-sans text-sm font-medium shadow-sm cursor-pointer"
          >
            <Facebook className="w-4 h-4 text-blue-600 fill-blue-600" />
            Facebook
          </button>
        </div>

        {/* Register Footer */}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          Need a Chef de Projet account?{' '}
          <Link to="/register" className="font-sans font-medium text-blue-600 hover:text-blue-800 transition-colors">
            Sign up publicly
          </Link>
        </div>
      </div>
    </div>
  );
};

