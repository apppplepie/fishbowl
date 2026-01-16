'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ResponsiveContextType {
  isMobile: boolean;
  screenWidth: number;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

/**
 * 响应式 Provider
 * 提供全局的响应式状态，确保所有组件使用相同的 isMobile 值
 * 
 * ⚠️ SSR Hydration 修复说明：
 * 为了避免服务器端渲染（SSR）和客户端水合（Hydration）不匹配的问题：
 * 1. 初始状态始终使用固定值（isMobile=false, screenWidth=1920），与服务器端保持一致
 * 2. 不在 useState 初始化时检查 window，因为这会导致服务器和客户端渲染不同的内容
 * 3. 使用 useEffect（而非 useLayoutEffect）在客户端水合完成后更新为实际的窗口尺寸
 * 4. 这样可以确保初次渲染时 DOM 结构完全一致，避免 React hydration mismatch 错误
 * 
 * 🚀 性能优化说明：
 * 1. 添加 100ms 防抖机制，避免 resize 事件频繁触发重渲染
 * 2. 只在值真正变化时才更新状态（使用函数式 setState 比较前后值）
 * 3. 防止页面路由切换时的状态抖动，减少 CPU 负载
 * 
 * 权衡：用户可能会看到短暂的布局闪烁（从桌面布局切换到移动布局），但这是 SSR 安全的标准做法
 */
export function ResponsiveProvider({ children }: { children: ReactNode }) {
  // 始终使用固定的初始值，确保服务器端和客户端初始渲染一致
  const [isMobile, setIsMobile] = useState(false);
  const [screenWidth, setScreenWidth] = useState(1920);

  useEffect(() => {
    // 此 effect 只在客户端水合（hydration）完成后运行
    let timeoutId: number | null = null;
    
    const checkResponsive = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      
      // ✅ 只在值真正变化时才更新状态，避免不必要的重渲染
      setScreenWidth(prevWidth => {
        if (prevWidth !== width) {
          return width;
        }
        return prevWidth;
      });
      
      setIsMobile(prevMobile => {
        if (prevMobile !== mobile) {
          return mobile;
        }
        return prevMobile;
      });
    };

    // 初始检测（在 hydration 之后）
    checkResponsive();

    // ✅ 监听窗口大小变化（带防抖，避免频繁触发重渲染）
    const handleResize = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        checkResponsive();
        timeoutId = null;
      }, 100); // 100ms 防抖，平衡响应速度和性能
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <ResponsiveContext.Provider value={{ isMobile, screenWidth }}>
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