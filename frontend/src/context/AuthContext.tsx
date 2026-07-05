 

import React, { createContext, useContext, useState, useEffect } from 'react';
import { axiosInstance, setAccessToken, getAccessToken } from '../api/axios'; 
import { User } from '../types'; 
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  unreadCount: number;
  login: (email: string, password: string) => Promise<User>;
  loginSocial: (accessToken: string, user: User) => void;
  registerChef: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forceChangePassword: (password: string) => Promise<void>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await axiosInstance.get('/notifications/unread-count');
      if (res.data.success) {
        setUnreadCount(res.data.data.count);
      }
    } catch (err) {
      // Ignore background fetch errors
    }
  };

  const refreshSession = async () => {
    try {
      const res = await axiosInstance.post('/auth/refresh', {});
      if (res.data.success) {
        const at = res.data.data.accessToken;
        setAccessToken(at);
        
        // Recover user payload from access token or fetch details if we had a profile route
        // To be secure, we can store user payload in local storage or get it from refresh payload
        // Let's write a quick login recovery:
        const payloadStr = at.split('.')[1];
        const payload = JSON.parse(atob(payloadStr));
        
        setUser({
          id: payload.userId,
          fullName: payload.email.split('@')[0], // placeholder name until details loaded
          email: payload.email,
          role: payload.role,
          isActive: true,
          isEmailVerified: true
        } as User);

        // Fetch real details or just trigger unread count
        fetchUnreadCount();
      }
    } catch (err) {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Attempt to recover session on mount
    refreshSession();

    // Listen for global auth expiration events from Axios interceptor
    const handleSessionExpired = () => {
      setUser(null);
      setAccessToken(null);
      setUnreadCount(0);
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
    };
  }, []);

  // Subscribe to real-time push notifications via SSE
  useEffect(() => {
    if (!user) return;

    // Fetch initial count
    fetchUnreadCount();

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      const token = getAccessToken();
      if (!token) return;

      const sseUrl = `${window.location.origin}/api/v1/notifications/sse?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const notif = JSON.parse(event.data);
          // Increment unread count in real-time
          setUnreadCount((prev) => prev + 1);

          // Dispatch a global event so other components (e.g. Topbar) can append to list
          window.dispatchEvent(new CustomEvent('new_notification', { detail: notif }));

          // Show a beautiful in-app toast for immediate visibility
          toast(notif.message, {
            icon: '🔔',
            duration: 6000,
            style: {
              background: '#0F172A',
              color: '#FFFFFF',
              fontSize: '13px',
              borderRadius: '10px',
              fontWeight: 500,
            },
          });
        } catch (err) {
          console.error('Failed to parse real-time notification event:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE Connection lost. Retrying...', err);
        if (eventSource) {
          eventSource.close();
        }
        // Graceful automatic reconnection
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await axiosInstance.post('/auth/login', { email, password });
    const { user: userPayload, accessToken: at } = res.data.data;
    setAccessToken(at);
    setUser(userPayload);
    await fetchUnreadCount();
    return userPayload;
  };

  const loginSocial = (accessToken: string, userPayload: User) => {
    setAccessToken(accessToken);
    setUser(userPayload);
    fetchUnreadCount();
  };

  const registerChef = async (fullName: string, email: string, password: string): Promise<void> => {
    await axiosInstance.post('/auth/register', { fullName, email, password });
  };

  const logout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (err) {
      // Clean up even if API call fails
    } finally {
      setAccessToken(null);
      setUser(null);
      setUnreadCount(0);
    }
  };

  const forceChangePassword = async (password: string): Promise<void> => {
    await axiosInstance.post('/auth/force-change-password', { password });
    // Invalidate session locally as backend also revoked active refresh tokens
    setAccessToken(null);
    setUser(null);
    setUnreadCount(0);
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    unreadCount,
    login,
    loginSocial,
    registerChef,
    logout,
    forceChangePassword,
    setUnreadCount,
    refreshSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
