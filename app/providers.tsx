'use client';

import { ReactNode } from 'react';
import { ChapterLabelProvider } from './contexts/ChapterLabelContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppThemeProvider } from './contexts/AppThemeContext';
import { HeaderProvider } from './contexts/HeaderContext';
import { PageShellProvider } from './contexts/PageShellContext';

/**
 * 客户端 Providers 包装组件
 * 用于包裹所有需要在客户端使用的 Context Providers
 * 
 * Provider 顺序说明：
 * 1. AppThemeProvider - 最外层，提供主题配置
 * 2. AuthProvider - 认证状态
 * 3. HeaderProvider - Header 配置
 * 4. PageShellProvider - PageShell 配置（在 HeaderProvider 之后，GlobalLayout 之前）
 * 5. ChapterLabelProvider - 章节标签缓存
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <HeaderProvider>
          <PageShellProvider>         {/* <- 包裹在 Header 之后，GlobalLayout 之前 */}
            <ChapterLabelProvider>
              {children}
            </ChapterLabelProvider>
          </PageShellProvider>
        </HeaderProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}
