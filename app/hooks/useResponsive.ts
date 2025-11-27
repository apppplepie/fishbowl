'use client';

import { useState, useEffect } from 'react';

/**
 * 响应式 Hook
 * 检测设备屏幕大小，用于适配移动端和桌面端
 */
export function useResponsive(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // 初始检测
    checkMobile();

    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return { isMobile };
}

