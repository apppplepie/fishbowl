'use client';

import { ReactNode } from 'react';
import { ChapterLabelProvider } from './contexts/ChapterLabelContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppThemeProvider } from './contexts/AppThemeContext';
import { HeaderProvider } from './contexts/HeaderContext';

/**
 * 客户端 Providers 包装组件
 * 用于包裹所有需要在客户端使用的 Context Providers
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <HeaderProvider>
          <ChapterLabelProvider>
            {children}
          </ChapterLabelProvider>
        </HeaderProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

