'use client';

import React from 'react';
import './PhotoWall.css';

interface PhotoWallProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 照片墙：多列布局，子项按自身宽高比自然高度，无壳无圆角，最少两列。
 */
export default function PhotoWall({ children, className = '' }: PhotoWallProps) {
  return (
    <div className={`photo-wall ${className}`.trim()}>
      {children}
    </div>
  );
}
