'use client';

import { useState, useEffect } from 'react';

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
 * 统一管理登录状态，基于 JWT Token
 */
export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 检查登录状态
  const checkLoginStatus = () => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      const storedUserStr = localStorage.getItem('user');
      
      if (storedToken && storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr);
          setIsLoggedIn(true);
          setToken(storedToken);
          setUser(storedUser);
          return true;
        } catch (error) {
          console.error('解析用户信息失败:', error);
          // 如果解析失败，清除无效数据
          logout();
        }
      } else {
        setIsLoggedIn(false);
        setToken(null);
        setUser(null);
      }
    }
    return false;
  };

  // 登录（兼容旧版本，实际登录在 LoginModal 中处理）
  const login = (username: string) => {
    // 触发检查，从 localStorage 读取最新数据
    checkLoginStatus();
    // 触发自定义事件通知状态变化
    window.dispatchEvent(new Event('loginStatusChanged'));
  };

  // 退出登录
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // 兼容旧版本
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    
    setIsLoggedIn(false);
    setToken(null);
    setUser(null);
    
    // 触发自定义事件通知状态变化
    window.dispatchEvent(new Event('loginStatusChanged'));
  };

  // 获取 Token（用于 API 请求）
  const getToken = () => {
    return token || localStorage.getItem('token');
  };

  // 检查是否是管理员
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // 检查是否有管理权限（管理员或版主）
  const canModerate = () => {
    return user?.role === 'admin' || user?.role === 'moderator';
  };

  // 同步登录状态（监听 localStorage 和自定义事件）
  useEffect(() => {
    const syncLoginStatus = () => {
      checkLoginStatus();
    };

    syncLoginStatus();

    // 监听 storage 变化（用于跨标签页同步）
    window.addEventListener('storage', syncLoginStatus);
    // 自定义事件（用于同一页面内同步）
    window.addEventListener('loginStatusChanged', syncLoginStatus);

    return () => {
      window.removeEventListener('storage', syncLoginStatus);
      window.removeEventListener('loginStatusChanged', syncLoginStatus);
    };
  }, []);

  return {
    isLoggedIn,
    user,
    token,
    username: user?.username || '', // 兼容旧版本
    login,
    logout,
    getToken,
    isAdmin,
    canModerate,
    checkLoginStatus,
  };
}

