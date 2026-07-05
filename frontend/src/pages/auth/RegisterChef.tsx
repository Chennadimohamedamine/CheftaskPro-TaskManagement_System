import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Button, Input } from '../../components/common/UI.js';
import {  ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  fullName: z.string().min(1, 'Full Name is required').max(100, 'Name is too long'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterChef: React.FC = () => {
  const { registerChef } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' }
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      await registerChef(values.fullName, values.email, values.password);
      toast.success('Registration successful! A verification email has been sent to your inbox.', { duration: 6000 });
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-slate-100 p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-md shadow-indigo-500/15">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-2xl text-slate-900 tracking-tight">Create Chef Account</h2>
          <p className="font-sans text-xs text-slate-500 mt-1">Register publicly to start creating projects and teams</p>
        </div>

        {/* Info Banner */}
        <div className="mb-5 bg-slate-50 border border-slate-100 rounded-lg p-3.5 text-[11px] text-slate-500 leading-normal font-sans">
          <strong>Notice:</strong> Standard Developers cannot self-register. Developer accounts must be created internally by a registered Chef de Projet.
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="fullName"
            label="Full Name"
            type="text"
            placeholder="Sarah Jenkins"
            error={errors.fullName?.message}
            {...register('fullName')}
          />

          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="sarah.j@company.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            id="password"
            label="Create Secure Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="text-[10px] text-slate-400 leading-relaxed font-sans px-1">
            Must contain 8+ characters, including at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol.
          </div>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500" isLoading={isLoading}>
            Register Chef
          </Button>
        </form>

        {/* Login Footer */}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-sans font-medium text-blue-600 hover:text-blue-800 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
