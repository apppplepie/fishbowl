'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface HeaderContextType {
  leftContent: ReactNode | null;
  setLeftContent: (content: ReactNode | null) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [leftContent, setLeftContent] = useState<ReactNode | null>(null);

  // 使用 useMemo 固定 context value，避免每次渲染都创建新对象
  // 这能防止所有使用 useHeader() 的组件（如 GlobalLayout、Header）不必要地重新渲染
  const contextValue = useMemo(
    () => ({ leftContent, setLeftContent }),
    [leftContent]
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

