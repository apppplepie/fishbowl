'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, CSSProperties } from 'react';
import { Theme } from '@/app/types/background';

/** 父容器内吸附的滚动位置（scrollTop = 该 vh），改这一处即可全局生效；与 box1 高度无关 */
export const DEFAULT_SCROLL_SNAP_VH = 15;

/**
 * PageShell 配置接口
 * 包含页面特定的配置选项（不包含主题，主题从 AppThemeContext 读取）
 */
export interface PageShellConfig {
  box1Content: ReactNode | null;
  hideBox1?: boolean;
  /** box1 固定高度，如 '18vh'、'400px'；不传则用 PageShell 内 DEFAULT_BOX1_HEIGHT（20vh） */
  box1Height?: string;
  box1Style?: CSSProperties;
  box2Style?: CSSProperties;
  themeOverride?: Theme; // 可选：覆盖全局主题（特殊场景使用）

  /**
   * 父容器内吸附的滚动位置（单位 vh）：进入页与松手时 scrollTo(scrollSnapVh)，使「整页从上往下该 vh 的那根线」贴住视口顶部。
   * 与 box1 高度无关。建议使用 DEFAULT_SCROLL_SNAP_VH。
   */
  scrollSnapVh?: number;

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
  scrollSnapVh: undefined,
  sidebarWidth: 0,
  sidebarExpanded: false,
};

/** 浅比较两个 config 是否等价，避免无意义的状态更新与重渲染 */
function isConfigEqual(a: PageShellConfig, b: PageShellConfig): boolean {
  return (
    a.box1Content === b.box1Content &&
    a.hideBox1 === b.hideBox1 &&
    a.box1Height === b.box1Height &&
    a.scrollSnapVh === b.scrollSnapVh &&
    a.sidebarWidth === b.sidebarWidth &&
    a.sidebarExpanded === b.sidebarExpanded &&
    a.themeOverride === b.themeOverride &&
    shallowEqualStyles(a.box1Style, b.box1Style) &&
    shallowEqualStyles(a.box2Style, b.box2Style)
  );
}

function shallowEqualStyles(
  a: CSSProperties | undefined,
  b: CSSProperties | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  const keysA = Object.keys(a) as (keyof CSSProperties)[];
  const keysB = Object.keys(b) as (keyof CSSProperties)[];
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => (a as Record<string, unknown>)[k as string] === (b as Record<string, unknown>)[k as string]);
}

/**
 * PageShellProvider - 全局 PageShell 配置提供者
 */
export function PageShellProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<PageShellConfig>(defaultConfig);

  // 固定 setConfig 引用；仅当合并后的 config 与 prev 不同时才更新状态，减少无效重渲染
  const setConfig = useCallback((newConfig: Partial<PageShellConfig> | ((prev: PageShellConfig) => Partial<PageShellConfig>)) => {
    setConfigState((prev) => {
      const actualConfig = typeof newConfig === 'function' ? newConfig(prev) : newConfig;
      const updated: PageShellConfig = {
        ...prev,
        ...actualConfig,
      };
      if (isConfigEqual(prev, updated)) {
        return prev;
      }
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
