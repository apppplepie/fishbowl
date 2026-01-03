'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: 'admin' | 'moderator' | 'user';
  max_access_level?: number;
}

/**
 * 认证 Hook
 * 使用 HttpOnly cookie 存储 refresh token，sessionStorage 存储 access token
 */
export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 兼容JWT的base64url解码
  const decodeJwtPayload = useCallback((jwtToken: string): any | null => {
    try {
      const parts = jwtToken.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }, []);

  // 清除认证数据
  const clearAuthData = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('access-token');
      sessionStorage.removeItem('user');
      // 兼容旧版本
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('username');
    }
    setIsLoggedIn(false);
    setToken(null);
    setUser(null);
  }, []);

  // 检查登录状态
  const checkLoginStatus = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem('access-token') || localStorage.getItem('token');
      const storedUserStr = sessionStorage.getItem('user') || localStorage.getItem('user');

      // 只要 token 存在，就尝试恢复登录态：优先使用已存 user，否则从 JWT payload 还原
      if (storedToken) {
        let resolvedUser: User | null = null;

        if (storedUserStr) {
          try {
            const parsed = JSON.parse(storedUserStr);
            if (parsed && typeof parsed === 'object' && parsed.id) {
              resolvedUser = parsed as User;
            }
          } catch (error) {
            console.warn('解析用户信息失败，将尝试从Token恢复:', error);
          }
        }

        if (!resolvedUser) {
          const payload = decodeJwtPayload(storedToken);
          if (payload?.id && payload?.username && payload?.email && payload?.role) {
            resolvedUser = {
              id: payload.id,
              username: payload.username,
              email: payload.email,
              display_name: payload.username,
              avatar_url: undefined,
              role: payload.role,
              max_access_level: payload.max_access_level,
            };
          }
        }

        if (resolvedUser) {
          // 将旧版localStorage写回新版sessionStorage（保持一致）
          sessionStorage.setItem('access-token', storedToken);
          sessionStorage.setItem('user', JSON.stringify(resolvedUser));
          setIsLoggedIn(true);
          setToken(storedToken);
          setUser(resolvedUser);
          return true;
        }

        // token 存在但无法恢复用户信息，视为无效登录态
        clearAuthData();
        return false;
      } else {
        setIsLoggedIn(false);
        setToken(null);
        setUser(null);
      }
    }
    return false;
  }, [clearAuthData, decodeJwtPayload]);

  // 自动刷新token
  const refreshToken = useCallback(async () => {
    if (isRefreshing) return null;

    try {
      setIsRefreshing(true);
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.accessToken) {
          // 更新access token
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('access-token', data.accessToken);
            // 兼容旧版：仍有大量代码读取 localStorage token
            localStorage.setItem('token', data.accessToken);
          }
          setToken(data.accessToken);
          return data.accessToken;
        }
      }

      // 刷新失败，清除认证数据
      clearAuthData();
      // 重定向到首页
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return null;

    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuthData();
      // 重定向到首页
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, clearAuthData]);

  // 登录
  const login = useCallback(async (accessToken: string, userData: User) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('access-token', accessToken);
      sessionStorage.setItem('user', JSON.stringify(userData));
      // 兼容旧版：仍有大量代码读取 localStorage token/user
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
    }
    setIsLoggedIn(true);
    setToken(accessToken);
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
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    // 清除客户端数据
    clearAuthData();

    // 触发自定义事件通知状态变化
    window.dispatchEvent(new Event('loginStatusChanged'));

    // 重定向到首页
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [clearAuthData]);

  // 获取 Token（用于 API 请求，支持自动刷新）
  const getToken = useCallback(async () => {
    if (!token) {
      // 尝试从sessionStorage获取
      const storedToken = typeof window !== 'undefined'
        ? (sessionStorage.getItem('access-token') || localStorage.getItem('token'))
        : null;
      if (storedToken) {
        // 保持两处一致（避免旧代码读不到）
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('access-token', storedToken);
          localStorage.setItem('token', storedToken);
        }
        setToken(storedToken);
        return storedToken;
      }
      return null;
    }

    // 检查token是否即将过期（提前5分钟刷新）
    try {
      const payload = decodeJwtPayload(token);
      if (!payload?.exp) {
        // payload解析失败或无exp，尝试刷新
        const newToken = await refreshToken();
        return newToken || token;
      }
      const exp = payload.exp * 1000; // 转换为毫秒
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (exp - now < fiveMinutes) {
        // Token即将过期，尝试刷新
        const newToken = await refreshToken();
        return newToken || token;
      }
    } catch (error) {
      console.error('Token解析失败:', error);
      // 如果解析失败，尝试刷新
      const newToken = await refreshToken();
      return newToken || null;
    }

    return token;
  }, [token, refreshToken, decodeJwtPayload]);

  // 检查是否是管理员
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // 检查是否有管理权限（管理员或版主）
  const canModerate = () => {
    return user?.role === 'admin' || user?.role === 'moderator';
  };

  // 同步登录状态
  useEffect(() => {
    const syncLoginStatus = () => {
      checkLoginStatus();
    };

    // 初始化时检查登录状态
    if (typeof window !== 'undefined') {
      syncLoginStatus();
      setIsLoading(false);

      // 监听 sessionStorage 变化（用于跨标签页同步）
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'access-token' || e.key === 'user') {
          syncLoginStatus();
        }
      };

      // 自定义事件（用于同一页面内同步）
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('loginStatusChanged', syncLoginStatus);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('loginStatusChanged', syncLoginStatus);
      };
    } else {
      setIsLoading(false);
    }
  }, [checkLoginStatus]);

  return {
    isLoggedIn,
    user,
    token,
    username: user?.username || '', // 兼容旧版本
    isLoading,
    login,
    logout,
    getToken,
    isAdmin,
    canModerate,
    checkLoginStatus,
  };
}

