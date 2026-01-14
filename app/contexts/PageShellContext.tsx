'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, CSSProperties } from 'react';
import { Theme } from '@/app/types/background';

/**
 * PageShell 配置接口
 * 包含所有 PageLayout 的配置选项
 */
export interface PageShellConfig {
  box1Content: ReactNode | null;
  box2Content?: ReactNode | null; // 支持 JSX / null
  box2ContentRenderer?: () => ReactNode; // 新增：函数形式动态渲染
  theme?: Theme;
  hideBox1?: boolean;
  box1Style?: CSSProperties;
  box2Style?: CSSProperties;
  box1BgColor?: string; // 向后兼容，用于生成默认 theme
  box2BgColor?: string; // 向后兼容，用于生成默认 theme
  containerPaddingTop?: string;
}

/**
 * PageShell Context 类型定义
 */
interface PageShellContextType {
  config: PageShellConfig;
  setConfig: (config: Partial<PageShellConfig>) => void;
  resetConfig: () => void;
}

const PageShellContext = createContext<PageShellContextType | undefined>(undefined);

/**
 * 默认配置
 */
const defaultConfig: PageShellConfig = {
  box1Content: null,
  box2Content: null,
  theme: undefined, // 不设置默认主题，让页面自己决定
  hideBox1: false,
  box1Style: undefined,
  box2Style: undefined,
  box1BgColor: '#4CAF50',
  box2BgColor: '#f5f5f5',
  containerPaddingTop: undefined,
};

/**
 * PageShellProvider - 全局 PageShell 配置提供者
 */
export function PageShellProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<PageShellConfig>(defaultConfig);

  // 固定 setConfig 引用
  const setConfig = useCallback((newConfig: Partial<PageShellConfig>) => {
    console.log('[PageShellProvider] setConfig 被调用:', {
      newConfig: {
        ...newConfig,
        theme: newConfig.theme ? { id: newConfig.theme.id, name: newConfig.theme.name } : undefined,
        hasBox1Content: !!newConfig.box1Content,
        hasBox2Content: !!newConfig.box2Content,
        hasBox2ContentRenderer: !!newConfig.box2ContentRenderer,
      }
    });

    setConfigState((prev) => {
      const updated = {
        ...prev,
        ...newConfig,
      };

      console.log('[PageShellProvider] config 状态更新:', {
        prevTheme: prev.theme ? { id: prev.theme.id, name: prev.theme.name } : undefined,
        newTheme: updated.theme ? { id: updated.theme.id, name: updated.theme.name } : undefined,
        hasBox1Content: !!updated.box1Content,
        hasBox2Content: !!updated.box2Content,
        hasBox2ContentRenderer: !!updated.box2ContentRenderer,
      });

      return updated;
    });
  }, []);

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
