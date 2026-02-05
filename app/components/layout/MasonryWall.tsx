'use client';

import React from 'react';
import './MasonryWall.css';

interface MasonryWallProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 横向瀑布流（CSS Grid）
 * - 不使用 column
 * - 不包 gap 容器
 * - 高度完全由 grid-row span 决定
 */
export default function MasonryWall({
  children,
  className = '',
  style,
}: MasonryWallProps) {
  return (
    <div
      className={`masonry-wall ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
