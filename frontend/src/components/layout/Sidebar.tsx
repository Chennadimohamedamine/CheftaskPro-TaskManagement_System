/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Role } from '../../types.js';
import {
  LayoutDashboard,
  Users,
  Code,
  Briefcase,
  History,
  CheckSquare,
  ShieldCheck
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const adminLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/chefs', label: 'Chefs de Projet', icon: ShieldCheck },
    { to: '/admin/developers', label: 'Developers', icon: Code },
    { to: '/admin/projects', label: 'Projects', icon: Briefcase },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: History }
  ];

  const chefLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/chef/projects', label: 'My Projects', icon: Briefcase },
    { to: '/chef/teams', label: 'My Teams', icon: Users },
    { to: '/chef/developers', label: 'Developers', icon: Code }
  ];

  const devLinks = [
    { to: '/', label: 'My Tasks', icon: CheckSquare }
  ];

  const getLinks = () => {
    switch (user.role) {
      case Role.ADMIN:
        return adminLinks;
      case Role.CHEF_PROJET:
        return chefLinks;
      case Role.DEVELOPER:
        return devLinks;
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-[calc(100vh-64px)] shrink-0 shadow-lg">
      {/* Navigation Options list */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block px-3 mb-3">
          Navigation Menu
        </span>

        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Identity */}
      <div className="border-t border-slate-800 p-4.5 bg-slate-950/40 text-center flex flex-col items-center">
        <span className="font-mono text-[9px] text-slate-500">Workspace Native Mode</span>
        <span className="font-sans text-[10px] font-semibold text-slate-400 mt-1 uppercase">
          {user.role.replace('_', ' ')}
        </span>
      </div>
    </aside>
  );
};
