 

import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, CheckSquare, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; 
import { axiosInstance } from '../../api/axios'; 
import { StatusBadge } from '../common/UI'; 
import { Notification } from '../../types'; 
import toast from 'react-hot-toast';

export const Topbar: React.FC = () => {
  const { user, logout, unreadCount, setUnreadCount } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await axiosInstance.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications');
    }
  };

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  // Listen for real-time notifications received via SSE
  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const notif = (e as CustomEvent).detail;
      setNotifications((prev) => {
        // Prevent duplicate appending (idempotency)
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
    };
    window.addEventListener('new_notification', handleNewNotification);
    return () => window.removeEventListener('new_notification', handleNewNotification);
  }, []);

  // Handle outside clicks to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axiosInstance.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      toast.success('Notification marked as read');
    } catch (err) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axiosInstance.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (err) {
      toast.error('Failed to log out');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null;

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-40 shadow-xs">
      {/* Brand Launcher Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/15">
          <CheckSquare className="w-5.5 h-5.5" />
        </div>
        <span className="font-display font-bold text-lg tracking-tight text-slate-900">
          TaskFlow<span className="text-indigo-600 font-bold text-[10px] ml-1.5 bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-indigo-100/30">Pro</span>
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center relative text-slate-500 hover:text-slate-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-100"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white font-sans text-[9px] font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-84 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <span className="font-sans font-bold text-xs uppercase tracking-wider text-slate-700">In-App Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="font-sans font-bold text-[11px] text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center font-sans text-xs text-slate-400">
                    All caught up! No recent updates.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3.5 border-b border-slate-50/50 flex items-start space-x-3 hover:bg-slate-50/40 transition-colors ${!n.isRead ? 'bg-indigo-50/10' : ''}`}
                    >
                      <div className="flex-1">
                        <p className="font-sans text-xs text-slate-600 leading-relaxed">{n.message}</p>
                        <span className="font-mono text-[9px] text-slate-400 block mt-2 font-medium">
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          className="w-5 h-5 rounded-full hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card & Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2.5 p-1.5 hover:bg-slate-50 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-100 cursor-pointer"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-sans font-bold text-xs text-slate-700 shadow-xs">
              {getInitials(user.fullName)}
            </div>

            {/* Title / Badge */}
            <div className="text-left hidden md:block">
              <div className="font-sans font-bold text-xs text-slate-800 tracking-tight leading-none mb-1">{user.fullName}</div>
              <div className="font-sans text-[10px] text-slate-400 leading-none truncate max-w-[140px] font-semibold">{user.email}</div>
            </div>

            <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-52 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-fade-in">
              <div className="px-4 py-2.5 border-b border-slate-50 mb-2">
                <span className="text-[9px] uppercase font-sans font-bold tracking-widest text-slate-400 block mb-1.5">Authenticated As</span>
                <StatusBadge status={user.role} />
              </div>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 font-sans font-bold text-xs text-rose-600 hover:bg-rose-50/50 flex items-center space-x-2.5 transition-colors duration-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
