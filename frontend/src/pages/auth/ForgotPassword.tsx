 

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { axiosInstance } from '../../api/axios'; 
import { Button, Input } from '../../components/common/UI'; 
import { KeyRound, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format')
});

type Values = z.infer<typeof schema>;

export const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' }
  });

  const onSubmit = async (values: Values) => {
    setIsLoading(true);
    try {
      await axiosInstance.post('/auth/forgot-password', { email: values.email });
      setIsSent(true);
      toast.success('Reset instructions sent if email exists.');
    } catch (err: any) {
      // Even in catch block, standard mock behaviors or failures can be caught gracefully
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-slate-100 p-8">
        {!isSent ? (
          <>
            {/* Header */}
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="font-display font-bold text-xl text-slate-900 tracking-tight">Recover Password</h2>
              <p className="font-sans text-xs text-slate-500 mt-1">
                Enter your registered email address and we will send you a secure link to reset your password.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                id="email"
                label="Email Address"
                type="email"
                placeholder="you@company.com"
                error={errors.email?.message}
                {...register('email')}
              />

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Send Reset Link
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
              <MailCheck className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 tracking-tight">Instructions Dispatched</h3>
            <p className="font-sans text-xs text-slate-500 mt-2 px-1 leading-relaxed">
              If an active account is registered under that address, an email containing further password recovery instructions has been dispatched. It should arrive in a few minutes.
            </p>
          </div>
        )}

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
