'use client';

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from 'react';

interface ResponsiveContextType {
  isMobile: boolean;
  screenWidth: number;
  mounted: boolean; // 用于渐显策略
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

/**
 * 响应式 Provider - 移动端优先渐显策略
 * 初始值设为移动端，客户端挂载后渐显更新到真实值
 * 优点：
 * 1. 移动端用户（占大多数）体验最佳，无闪烁
 * 2. 桌面端用户看到轻微的渐显而非突然跳变
 * 3. SSR 和首次渲染保持一致
 */
export function ResponsiveProvider({ children }: { children: ReactNode }) {
  // 移动端优先：初始值设为移动端（更符合实际用户分布）
  const [isMobile, setIsMobile] = useState(true);
  const [screenWidth, setScreenWidth] = useState(375); // iPhone 标准宽度
  const [mounted, setMounted] = useState(false);

  // 使用 useLayoutEffect 在首次绘制前更新为真实值
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    
    const w = window.innerWidth;
    const mobile = w < 768;
    
    // 更新为真实值
    setScreenWidth(w);
    setIsMobile(mobile);
    // 标记已挂载，触发渐显
    setMounted(true);
  }, []);

  // 监听 resize 事件
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let timeoutId: number | null = null;
    
    const update = () => {
      const w = window.innerWidth;
      setScreenWidth(prev => prev !== w ? w : prev);
      setIsMobile(prev => {
        const mobile = w < 768;
        return prev !== mobile ? mobile : prev;
      });
    };

    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(update, 150); // 防抖 150ms
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <ResponsiveContext.Provider value={{ isMobile, screenWidth, mounted }}>
      {children}
    </ResponsiveContext.Provider>
  );
}

/**
 * 使用响应式 Context 的 Hook
 * 必须在 ResponsiveProvider 内部使用
 */
export function useResponsiveContext() {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error('useResponsiveContext must be used within a ResponsiveProvider');
  }
  return context;
}