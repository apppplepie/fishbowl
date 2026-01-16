'use client';

import { useResponsiveContext } from '../contexts/ResponsiveContext';

/**
 * 响应式 Hook
 * 检测设备屏幕大小，用于适配移动端和桌面端
 * 
 * 现在使用全局 Context 来确保所有页面使用相同的响应式状态
 */
export function useResponsive(breakpoint: number = 768) {
  const { isMobile: contextIsMobile, screenWidth } = useResponsiveContext();
  
  // 如果使用默认断点（768），直接返回 Context 中的值
  if (breakpoint === 768) {
    return { isMobile: contextIsMobile };
  }
  
  // 如果使用自定义断点，基于 screenWidth 计算
  return { isMobile: screenWidth < breakpoint };
}

