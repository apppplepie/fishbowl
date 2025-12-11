'use client';

import { ReactNode, CSSProperties } from 'react';
import { useResponsive } from '@/app/hooks/useResponsive';

interface PageLayoutProps {
  children: ReactNode;
  box1BgColor?: string; // 盒模型1的背景色
  box2BgColor?: string; // 盒模型2的背景色
  box1Content?: ReactNode; // 盒模型1的内容（可选）
  box1Style?: CSSProperties; // 自定义盒模型1样式
  box2Style?: CSSProperties; // 自定义盒模型2样式
}

export default function PageLayout({
  children,
  box1BgColor = '#4CAF50',
  box2BgColor = '#f5f5f5',
  box1Content,
  box1Style,
  box2Style,
}: PageLayoutProps) {
  const { isMobile } = useResponsive();

  return (
    <>
      {/* 固定黑框 - 始终显示在视口 */}
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
        {/* 上边框 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '45px',
          background: 'black',
        }} />
        
        {/* 左边框 */}
        <div style={{
          position: 'absolute',
          top: '45px',
          left: 0,
          bottom: 0,
          width: '6px',
          background: 'black',
        }} />
        
        {/* 右边框 */}
        <div style={{
          position: 'absolute',
          top: '45px',
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
          height: '6px',
          background: 'black',
        }} />
      </div>

      {/* 内容区域 */}
      <div
        style={{
          paddingTop: '45px',
          paddingLeft: '6px',
          paddingRight: '6px',
          paddingBottom: '6px',
          minHeight: '100vh',
          boxSizing: 'border-box',
        }}
      >
        {/* 盒模型1：顶部区域，最小60px高，可自适应 */}
        <div
          style={{
            minHeight: '60px',
            background: box1BgColor,
            ...box1Style,
          }}
        >
          {box1Content}
        </div>

        {/* 盒模型2：内容区域，紧贴盒模型1 */}
        <div
          style={{
            background: box2BgColor,
            minHeight: 'calc(100vh - 60px - 45px - 6px)',
            ...box2Style,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

