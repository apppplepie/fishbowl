'use client';

import { ReactNode } from 'react';
import { ChapterLabelProvider } from './contexts/ChapterLabelContext';
import { AuthProvider } from './contexts/AuthContext';

/**
 * 客户端 Providers 包装组件
 * 用于包裹所有需要在客户端使用的 Context Providers
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ChapterLabelProvider>
        {children}
      </ChapterLabelProvider>
    </AuthProvider>
  );
}

