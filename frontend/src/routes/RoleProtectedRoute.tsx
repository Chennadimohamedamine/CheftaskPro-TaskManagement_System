 

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'chef_projet' | 'developer')[];
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading TaskFlow Pro...</p>
        </div>
      </div>
    );
  }

  // 1. Not Authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Forced password change rule
  if (user.mustChangePassword && location.pathname !== '/force-change-password') {
    return <Navigate to="/force-change-password" replace />;
  }

  // 3. User authenticated but doesn't need to change password (prevent looping when already on the reset page)
  if (!user.mustChangePassword && location.pathname === '/force-change-password') {
    return <Navigate to="/" replace />;
  }

  // 4. Role Authorization check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to home if they don't have permission
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
