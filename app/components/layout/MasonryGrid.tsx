'use client';

import React from 'react';
import './MasonryGrid.css';

interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
  /** 最小列数，如 2 则窄屏也保持至少 2 列 */
  minColumns?: number;
  /** 列数锁：传入时覆盖 CSS auto-fill，避免数据分批进入时布局误判 */
  style?: React.CSSProperties;
}

/**
 * 纯 CSS 瀑布流：auto-fill + minmax，span 由服务端预计算；可传 style.gridTemplateColumns 锁定列数
 */
export default function MasonryGrid({ children, className = '', minColumns, style }: MasonryGridProps) {
  const minColsClass = minColumns && minColumns >= 2 ? ' masonry-grid--min-2-cols' : '';
  return (
    <div className={`masonry-grid${minColsClass} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
