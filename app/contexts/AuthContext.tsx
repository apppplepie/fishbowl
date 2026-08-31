'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/apiClient';

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_base64?: string;
  role: 'admin' | 'moderator' | 'user';
  max_access_level?: number;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  token: null;
  username: string;
  isLoading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<null>;
  isAdmin: () => boolean;
  canModerate: () => boolean;
  checkLoginStatus: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkLoginStatus = useCallback(async () => {
    try {
      const response = await apiGet('/api/auth/me');
      if (!response.ok) {
        setUser(null);
        return false;
      }
      const data = await response.json();
      const nextUser = data.success && data.user ? data.user as User : null;
      setUser(nextUser);
      return !!nextUser;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setUser(null);
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await checkLoginStatus();
  }, [checkLoginStatus]);

  const login = useCallback(async (userData: User) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', keepalive: true });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
    setUser(null);
    router.replace('/');
  }, [router]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      await checkLoginStatus();
      if (active) setIsLoading(false);
    };
    void initialize();
    return () => {
      active = false;
    };
  }, [checkLoginStatus]);

  const value: AuthContextType = {
    isLoggedIn: !!user,
    user,
    token: null,
    username: user?.username || '',
    isLoading,
    login,
    logout,
    getToken: async () => null,
    isAdmin: () => user?.role === 'admin',
    canModerate: () => user?.role === 'admin' || user?.role === 'moderator',
    checkLoginStatus,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
