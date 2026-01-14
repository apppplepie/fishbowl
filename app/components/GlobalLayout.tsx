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
      
      {/* 固定黑框 - 全局挂载，首页除外 */}
      {!isHomePage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none', // 让点击事件穿透
            zIndex: 9999,
          }}
        >
          {/* 上边框 - 从header下方开始（45px），避免与header重叠 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '0px',
            background: 'black',
          }} />
          
          {/* 左边框 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '6px',
            background: 'black',
          }} />
          
          {/* 右边框 */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '6px',
            background: 'black',
          }} />
          
          {/* 下边框 */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 'calc(6px + env(safe-area-inset-bottom, 0px))',
            background: 'black',
          }} />
        </div>
      )}
      
      {/* 主内容区域 */}
      <main style={mainStyle}>
        {children}
      </main>
    </>
  );
}

export default React.memo(GlobalLayout);

