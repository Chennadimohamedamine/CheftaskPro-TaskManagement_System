import React, { createContext, useContext, useState, useEffect } from 'react';
import { axiosInstance, setAccessToken } from '../api/axios.js';
import { User } from '../types.js';

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
      console.log(res.data);
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

  // Poll notifications in background when logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchUnreadCount, 30000); // 30s
    return () => clearInterval(interval);
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
