/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { axiosInstance } from '../../api/axios.js';
import { Button } from '../../components/common/UI.js';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const doVerification = async () => {
      if (!token) {
        setStatus('error');
        setErrorMsg('Verification token is missing from the link URL.');
        return;
      }

      try {
        await axiosInstance.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.response?.data?.message || 'Verification failed. The token may be expired or already used.');
      }
    };

    doVerification();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-slate-100 p-8 text-center">
        {status === 'verifying' && (
          <div className="flex flex-col items-center py-6">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="font-display font-semibold text-lg text-slate-800">Verifying Your Account</h3>
            <p className="font-sans text-xs text-slate-500 mt-1">Please wait while we validate your signature token...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-4 border border-green-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 tracking-tight">Email Verified!</h3>
            <p className="font-sans text-xs text-slate-500 mt-1.5 px-2 leading-relaxed">
              Congratulations! Your Chef de Projet account has been successfully verified. You are now ready to log in and manage your projects.
            </p>
            <div className="mt-6 w-full">
              <Link to="/login">
                <Button className="w-full">
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-4 border border-red-200">
              <XCircle className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 tracking-tight">Verification Failed</h3>
            <p className="font-sans text-xs text-red-600 font-medium mt-1">
              {errorMsg}
            </p>
            <p className="font-sans text-xs text-slate-400 mt-2 leading-relaxed px-4">
              If the link expired, please log back in under your chef email to request a new verification link.
            </p>
            <div className="mt-6 w-full">
              <Link to="/login">
                <Button variant="secondary" className="w-full">
                  Go back to Login
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
