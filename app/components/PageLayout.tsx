'use client';

import { ReactNode, CSSProperties } from 'react';

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
  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        borderTop: '45px solid black',
        borderLeft: '6px solid black',
        borderRight: '6px solid black',
        borderBottom: '6px solid black',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* 盒模型1：顶部区域，最小60px高，可自适应，紧贴大盒子边框 */}
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
  );
}

