'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, CSSProperties } from 'react';
import { Theme } from '@/app/types/background';

/**
 * PageShell 配置接口
 * 包含页面特定的配置选项（不包含主题，主题从 AppThemeContext 读取）
 */
export interface PageShellConfig {
  box1Content: ReactNode | null;
  hideBox1?: boolean;
  box1Style?: CSSProperties;
  box2Style?: CSSProperties;
  themeOverride?: Theme; // 可选：覆盖全局主题（特殊场景使用）
  
  // 侧边栏配置
  sidebarWidth?: number;      // 侧边栏宽度（默认 0，表示无侧边栏）
  sidebarExpanded?: boolean;  // 侧边栏是否展开
}

/**
 * PageShell Context 类型定义
 */
interface PageShellContextType {
  config: PageShellConfig;
  setConfig: (config: Partial<PageShellConfig> | ((prev: PageShellConfig) => Partial<PageShellConfig>)) => void;
  resetConfig: () => void;
}

const PageShellContext = createContext<PageShellContextType | undefined>(undefined);

/**
 * 默认配置
 */
const defaultConfig: PageShellConfig = {
  box1Content: null,
  hideBox1: false,
  box1Style: undefined,
  box2Style: undefined,
  themeOverride: undefined,
  sidebarWidth: 0,
  sidebarExpanded: false,
};

/**
 * PageShellProvider - 全局 PageShell 配置提供者
 */
export function PageShellProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<PageShellConfig>(defaultConfig);

  // 固定 setConfig 引用
  // ✅ 使用函数式更新避免闭包问题，不需要依赖 config
  const setConfig = useCallback((newConfig: Partial<PageShellConfig> | ((prev: PageShellConfig) => Partial<PageShellConfig>)) => {
    setConfigState((prev) => {
      // 在函数式更新内部计算 actualConfig，使用 prev 而不是外部的 config
      const actualConfig = typeof newConfig === 'function' ? newConfig(prev) : newConfig;

      if (process.env.NODE_ENV === 'development') {
        console.log('[PageShellProvider] setConfig 被调用:', {
          newConfig: {
            hasBox1Content: !!actualConfig.box1Content,
            hideBox1: actualConfig.hideBox1,
            hasBox1Style: !!actualConfig.box1Style,
            hasBox2Style: !!actualConfig.box2Style,
            hasThemeOverride: !!actualConfig.themeOverride,
            sidebarWidth: actualConfig.sidebarWidth,
            sidebarExpanded: actualConfig.sidebarExpanded,
          }
        });
      }

      const updated = {
        ...prev,
        ...actualConfig,
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('[PageShellProvider] config 状态更新:', {
          hasBox1Content: !!updated.box1Content,
          hideBox1: updated.hideBox1,
          hasBox1Style: !!updated.box1Style,
          hasBox2Style: !!updated.box2Style,
          hasThemeOverride: !!updated.themeOverride,
          sidebarWidth: updated.sidebarWidth,
          sidebarExpanded: updated.sidebarExpanded,
        });
      }

      return updated;
    });
  }, []); // ✅ 依赖项可以是空数组，因为使用了函数式更新

  // 固定 resetConfig 引用
  const resetConfig = useCallback(() => {
    setConfigState(defaultConfig);
  }, []);

  // 使用 useMemo 固定 context value，减少不必要渲染
  const contextValue = useMemo(
    () => ({
      config,
      setConfig,
      resetConfig,
    }),
    [config, setConfig, resetConfig]
  );

  return <PageShellContext.Provider value={contextValue}>{children}</PageShellContext.Provider>;
}

/**
 * 使用 PageShell 配置的 Hook
 * @throws {Error} 如果不在 PageShellProvider 内使用会抛出错误
 */
export function usePageShell() {
  const context = useContext(PageShellContext);
  if (!context) {
    throw new Error('usePageShell must be used within a PageShellProvider');
  }
  return context;
}
