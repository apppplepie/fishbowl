'use client';

import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import { useHeader } from '../contexts/HeaderContext';

/**
 * 全局 Layout 组件
 * 包含 Header，永驻不随路由卸载
 */
function GlobalLayout({ children }: { children: React.ReactNode }) {
  const { leftContent } = useHeader();
  const pathname = usePathname();
  
  // 首页使用自定义导航栏，不显示全局 Header
  const isHomePage = pathname === '/';

  // 固定 main 的 style 对象，避免每次渲染都创建新对象
  const mainStyle = useMemo(() => ({ paddingTop: isHomePage ? '0' : '45px' }), [isHomePage]);

  return (
    <>
      {/* Header 永驻，不随路由卸载（首页除外） */}
      {!isHomePage && <Header leftContent={leftContent} />}
      
      {/* 主内容区域 */}
      <main style={mainStyle}>
        {children}
      </main>
    </>
  );
}

export default React.memo(GlobalLayout);

