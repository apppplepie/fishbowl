'use client';

import { useState, useEffect } from 'react';

/**
 * 认证 Hook
 * 统一管理登录状态，避免在多个组件中重复逻辑
 */
export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  // 检查登录状态
  const checkLoginStatus = () => {
    if (typeof window !== 'undefined') {
      const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const storedUsername = localStorage.getItem('username') || '访客';
      setIsLoggedIn(loggedIn);
      setUsername(storedUsername);
      return loggedIn;
    }
    return false;
  };

  // 登录
  const login = (user: string) => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('username', user);
    setIsLoggedIn(true);
    setUsername(user);
    // 触发自定义事件通知状态变化
    window.dispatchEvent(new Event('loginStatusChanged'));
  };

  // 退出登录
  const logout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    // 触发自定义事件通知状态变化
    window.dispatchEvent(new Event('loginStatusChanged'));
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
    username,
    login,
    logout,
    checkLoginStatus,
  };
}

