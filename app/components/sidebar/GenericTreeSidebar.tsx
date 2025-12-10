'use client';

import React from 'react';

/**
 * 通用侧边栏包装器
 * 用于桌面端固定侧边栏显示
 */
interface GenericTreeSidebarProps {
  children: React.ReactNode;
}

export default function GenericTreeSidebar({ children }: GenericTreeSidebarProps) {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}

