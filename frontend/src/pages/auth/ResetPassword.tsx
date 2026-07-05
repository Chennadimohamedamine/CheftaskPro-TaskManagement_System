/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { axiosInstance } from '../../api/axios.js';
import { Button, Input } from '../../components/common/UI.js';
import { KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

type Values = z.infer<typeof schema>;

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  const onSubmit = async (values: Values) => {
    if (!token) {
      toast.error('Reset token is missing from the link URL.');
      return;
    }

    setIsLoading(true);
    try {
      await axiosInstance.post('/auth/reset-password', {
        token,
        password: values.password
      });
      toast.success('Your password has been successfully reset! You can now log in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Password reset failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-slate-100 p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-xl text-slate-900 tracking-tight">Set New Password</h2>
          <p className="font-sans text-xs text-slate-500 mt-1">
            Please type in your new permanent password and confirm it below.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="password"
            label="New Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            id="confirmPassword"
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <div className="text-[10px] text-slate-400 font-sans px-1 leading-normal">
            Must contain 8+ characters, with at least 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Update Password
          </Button>
        </form>

        {/* Back Link */}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs">
          <Link to="/login" className="font-sans font-medium text-blue-600 hover:text-blue-800 transition-colors">
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
