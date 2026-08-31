'use client';

import { ReactNode } from 'react';
import { ChapterLabelProvider } from './contexts/ChapterLabelContext';
import { AuthProvider } from './contexts/AuthContext';
import { HeaderProvider } from './contexts/HeaderContext';
import { PageShellProvider } from './contexts/PageShellContext';
import { ResponsiveProvider } from './contexts/ResponsiveContext';
import { AccessFilterProvider } from './contexts/AccessFilterContext';

/**
 * 客户端 Providers 包装组件
 * 用于包裹所有需要在客户端使用的 Context Providers
 * 
 * Provider 顺序说明：
 * AppThemeProvider 已在根布局提供，这里只组合其余客户端状态。
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ResponsiveProvider>
      <AuthProvider>
        <AccessFilterProvider>
          <HeaderProvider>
            <PageShellProvider>
              <ChapterLabelProvider>
                {children}
              </ChapterLabelProvider>
            </PageShellProvider>
          </HeaderProvider>
        </AccessFilterProvider>
      </AuthProvider>
    </ResponsiveProvider>
  );
}
