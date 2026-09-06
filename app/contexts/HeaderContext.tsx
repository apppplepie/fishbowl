'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface HeaderContextType {
  leftContent: ReactNode | null;
  setLeftContent: (content: ReactNode | null) => void;
  /**
   * 覆盖 header 导航的高亮项。
   * 书房那三项（文章 / 书籍 / 画作）走的是同一个路由，只有 query 不同，
   * 光靠 pathname 分不出来，所以由页面自己把当前那一项报上来。
   */
  activeNavKey: string | null;
  setActiveNavKey: (key: string | null) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [leftContent, setLeftContent] = useState<ReactNode | null>(null);
  const [activeNavKey, setActiveNavKey] = useState<string | null>(null);

  // 使用 useMemo 固定 context value，避免每次渲染都创建新对象
  // 这能防止所有使用 useHeader() 的组件（如 GlobalLayout、Header）不必要地重新渲染
  const contextValue = useMemo(
    () => ({ leftContent, setLeftContent, activeNavKey, setActiveNavKey }),
    [leftContent, activeNavKey]
  );

  return (
    <HeaderContext.Provider value={contextValue}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
}
