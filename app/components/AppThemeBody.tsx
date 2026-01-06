'use client';

import React from 'react';
import { useAppTheme } from '@/app/contexts/AppThemeContext';

interface AppThemeBodyProps {
  children: React.ReactNode;
}

export const AppThemeBody: React.FC<AppThemeBodyProps> = ({ children }) => {
  const { currentFishbowlTheme, mounted } = useAppTheme();

  // 如果还没挂载，使用默认背景
  const bodyBackground = mounted ? currentFishbowlTheme.pageBg : 'bg-gray-100';

  return (
    <body
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundAttachment: 'fixed',
        minHeight: '100vh'
      }}
      className={`antialiased ${bodyBackground}`}
    >
      {children}
    </body>
  );
};
