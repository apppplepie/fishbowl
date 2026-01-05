'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiGet } from '@/lib/apiClient';

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: 'admin' | 'moderator' | 'user';
  max_access_level?: number;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  token: null; // 不再提供 token（存储在 HttpOnly cookie 中）
  username: string;
  isLoading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<null>;
  isAdmin: () => boolean;
  canModerate: () => boolean;
  checkLoginStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - 全局认证状态提供者
 * 使用 HttpOnly Cookie 存储 token，前端只存储用户信息用于 UI 显示
 * 确保整个应用只有一个认证状态实例，避免重复请求
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 清除认证数据（只清除用户信息，token 在 cookie 中由后端管理）
  const clearAuthData = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user');
      localStorage.removeItem('user');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('username');
      // 清除旧的 token 存储（兼容旧版本）
      sessionStorage.removeItem('access-token');
      localStorage.removeItem('token');
    }
    setIsLoggedIn(false);
    setUser(null);
  }, []);

  // 检查登录状态（通过调用 /api/auth/me 验证 cookie 中的 token）
  const checkLoginStatus = useCallback(async () => {
    if (typeof window === 'undefined') return false;

    // 先尝试从本地存储恢复用户信息（用于快速显示）
    const storedUserStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (storedUserStr) {
      try {
        const parsed = JSON.parse(storedUserStr);
        if (parsed && typeof parsed === 'object' && parsed.id) {
          setUser(parsed as User);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.warn('解析用户信息失败:', error);
      }
    }

    // 调用 API 验证登录状态（使用 apiGet，自动处理 401 和 token 刷新）
    try {
      const response = await apiGet('/api/auth/me');

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const userData = data.user as User;
          // 更新用户信息到本地存储
          sessionStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('user', JSON.stringify(userData));
          setIsLoggedIn(true);
          setUser(userData);
          return true;
        }
      }

      // 验证失败（可能是 401 且刷新也失败了）
      // 不在这里清除数据，由 authRefreshFailed 事件统一处理
      console.warn('⚠️ 登录状态验证失败');
      return false;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      // 网络错误时，如果有本地用户信息，保持登录状态（可能是网络问题）
      // 如果没有本地信息，清除登录状态
      if (!storedUserStr) {
        clearAuthData();
      }
      return false;
    }
  }, [clearAuthData]);

  // 登录（token 已存储在 HttpOnly cookie 中，这里只存储用户信息）
  const login = useCallback(async (userData: User) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('isLoggedIn', 'true');
    }
    setIsLoggedIn(true);
    setUser(userData);

    // 触发自定义事件通知状态变化
    window.dispatchEvent(new Event('loginStatusChanged'));
  }, []);

  // 退出登录
  const logout = useCallback(async () => {
    try {
      // 调用logout API清除服务端cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 携带 cookie
        // 尽量确保在页面跳转/刷新时也能把请求发出去
        keepalive: true,
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    // 清除客户端数据
    clearAuthData();

    // 触发自定义事件通知状态变化
    window.dispatchEvent(new Event('loginStatusChanged'));

    // 安全起见：退出后强制整页跳转（刷新）到首页，避免残留敏感 UI/缓存数据
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    }
  }, [clearAuthData]);

  // 获取 Token（已废弃：token 存储在 HttpOnly cookie 中，前端无法访问）
  // 保留此函数以兼容旧代码，但始终返回 null
  const getToken = useCallback(async () => {
    // Token 存储在 HttpOnly cookie 中，前端无法访问
    // 所有 API 请求会自动携带 cookie，无需手动获取 token
    return null;
  }, []);

  // 检查是否是管理员
  const isAdmin = useCallback(() => {
    return user?.role === 'admin';
  }, [user]);

  // 检查是否有管理权限（管理员或版主）
  const canModerate = useCallback(() => {
    return user?.role === 'admin' || user?.role === 'moderator';
  }, [user]);

  // 同步登录状态 - 只在 Provider 层面执行一次
  useEffect(() => {
    const syncLoginStatus = async () => {
      await checkLoginStatus();
    };

    // 处理刷新失败（refresh token 过期）
    const handleAuthRefreshFailed = () => {
      console.warn('🚪 Refresh token 已过期，清除登录状态');
      clearAuthData();
      
      // 可选：显示提示
      if (typeof window !== 'undefined') {
        // 可以触发一个全局提示
        const event = new CustomEvent('showLoginPrompt', {
          detail: { message: '登录已过期，请重新登录' }
        });
        window.dispatchEvent(event);
      }
    };

    // 初始化时检查登录状态
    if (typeof window !== 'undefined') {
      syncLoginStatus().then(() => {
        setIsLoading(false);
      });

      // 监听 sessionStorage 变化（用于跨标签页同步）
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'user') {
          syncLoginStatus();
        }
      };

      // 自定义事件（用于同一页面内同步）
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('loginStatusChanged', syncLoginStatus);
      window.addEventListener('authRefreshFailed', handleAuthRefreshFailed);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('loginStatusChanged', syncLoginStatus);
        window.removeEventListener('authRefreshFailed', handleAuthRefreshFailed);
      };
    } else {
      setIsLoading(false);
    }
  }, [checkLoginStatus, clearAuthData]);

  const value: AuthContextType = {
    isLoggedIn,
    user,
    token: null,
    username: user?.username || '',
    isLoading,
    login,
    logout,
    getToken,
    isAdmin,
    canModerate,
    checkLoginStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook - 从 Context 获取认证状态
 * 确保在 AuthProvider 内部使用
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

