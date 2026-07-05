 

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; 
import { Role } from '../../types'; 
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
    { to: '/', label: 'Dashboard Overview', icon: LayoutDashboard },
    { to: '/admin/chefs', label: 'Chefs de Projet', icon: ShieldCheck },
    { to: '/admin/developers', label: 'Platform Developers', icon: Code },
    { to: '/admin/projects', label: 'Global Projects', icon: Briefcase },
    { to: '/admin/audit-logs', label: 'System Audit Logs', icon: History }
  ];

  const chefLinks = [
    { to: '/', label: 'Workspace Dashboard', icon: LayoutDashboard },
    { to: '/chef/projects', label: 'My Project Pipelines', icon: Briefcase },
    { to: '/chef/teams', label: 'My Engineering Teams', icon: Users },
    { to: '/chef/developers', label: 'Developer Directory', icon: Code }
  ];

  const devLinks = [
    { to: '/', label: 'My Active Tasks', icon: CheckSquare }
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
    <aside className="w-68 bg-slate-950 text-slate-300 flex flex-col h-[calc(100vh-64px)] shrink-0 border-r border-slate-900 shadow-xl">
      {/* Navigation Options list */}
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-slate-500 block px-4 mb-4">
          Navigation Hub
        </span>

        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer group
                ${isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20 translate-x-1'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Identity */}
      <div className="border-t border-slate-900 p-6 bg-slate-950 text-center flex flex-col items-center">
        <div className="flex items-center space-x-2 bg-slate-900/60 px-4.5 py-2.5 rounded-xl border border-slate-800/40 w-full justify-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold">
            {user.role.replace('_', ' ')}
          </span>
        </div>
        <p className="font-sans text-[10px] text-slate-600 mt-2.5 font-semibold">Workspace Connected</p>
      </div>
    </aside>
  );
};
