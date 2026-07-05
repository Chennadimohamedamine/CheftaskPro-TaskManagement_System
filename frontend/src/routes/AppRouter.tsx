 

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 
import { RoleProtectedRoute } from './RoleProtectedRoute'; 
import { Topbar } from '../components/layout/Topbar'; 
import { Sidebar } from '../components/layout/Sidebar'; 

// Auth Pages
import { Login } from '../pages/auth/Login'; 
import { RegisterChef } from '../pages/auth/RegisterChef'; 
import { VerifyEmail } from '../pages/auth/VerifyEmail'; 
import { ForgotPassword } from '../pages/auth/ForgotPassword'; 
import { ResetPassword } from '../pages/auth/ResetPassword'; 
import { ForceChangePassword } from '../pages/auth/ForceChangePassword'; 

// Dashboards
import { AdminDashboard } from '../pages/admin/Dashboard'; 
import { ChefDashboard } from '../pages/chef/Dashboard'; 
import { DeveloperDashboard } from '../pages/developer/Dashboard'; 

// Project details
import { ProjectDetail } from '../pages/chef/ProjectDetail'; 

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

const DashboardSelector: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'chef_projet':
      return <ChefDashboard />;
    case 'developer':
      return <DeveloperDashboard />;
    default:
      return <div className="p-8 text-center text-slate-500 font-sans">Role resolution error. Role: {user.role}</div>;
  }
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterChef />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Forced Password Change Route */}
      <Route
        path="/force-change-password"
        element={
          <RoleProtectedRoute>
            <ForceChangePassword />
          </RoleProtectedRoute>
        }
      />

      {/* Authenticated Routes with Shell Layout */}
      <Route
        path="/"
        element={
          <RoleProtectedRoute>
            <MainLayout>
              <DashboardSelector />
            </MainLayout>
          </RoleProtectedRoute>
        }
      />

      {/* Admin Specific Pages */}
      <Route
        path="/admin/chefs"
        element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/developers"
        element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/projects"
        element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </RoleProtectedRoute>
        }
      />

      {/* Chef Specific Pages */}
      <Route
        path="/chef/projects"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'chef_projet']}>
            <MainLayout>
              <ChefDashboard />
            </MainLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/chef/teams"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'chef_projet']}>
            <MainLayout>
              <ChefDashboard />
            </MainLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/chef/developers"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'chef_projet']}>
            <MainLayout>
              <ChefDashboard />
            </MainLayout>
          </RoleProtectedRoute>
        }
      />

      <Route
        path="/chef/projects/:id"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'chef_projet']}>
            <MainLayout>
              <ProjectDetail />
            </MainLayout>
          </RoleProtectedRoute>
        }
      />

      {/* Catch All Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
