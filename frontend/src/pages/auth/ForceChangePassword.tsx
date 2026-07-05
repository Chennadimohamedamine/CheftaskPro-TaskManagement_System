 

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; 
import { Button, Input } from '../../components/common/UI'; 
import { ShieldAlert } from 'lucide-react';
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

export const ForceChangePassword: React.FC = () => {
  const { forceChangePassword } = useAuth();
  const navigate = useNavigate();
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
    setIsLoading(true);
    try {
      await forceChangePassword(values.password);
      toast.success('Your temporary password has been updated! Please sign in with your new permanent password.', { duration: 6000 });
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        {/* Warning Icon */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mb-4 border border-amber-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="font-display font-bold text-xl text-slate-900 tracking-tight">Change Password Required</h2>
          <p className="font-sans text-xs text-slate-500 mt-1.5 px-2">
            You are logging in with a temporary password or setup token. To secure your account, you must select a permanent password before accessing the workspace.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="password"
            label="Select Permanent Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            id="confirmPassword"
            label="Confirm Permanent Password"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <div className="text-[10px] text-slate-400 font-sans leading-normal">
            Must contain 8+ characters, with at least 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.
          </div>

          <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 shadow-amber-600/10" isLoading={isLoading}>
            Set Password & Proceed
          </Button>
        </form>
      </div>
    </div>
  );
};
