'use client';

import React from 'react';
import './MasonryGridCSS.css';

// --- 配置常量 ---
const DEFAULT_MIN_COLUMNS = 1;
const MAX_COLUMNS = 4;
const MIN_COLUMN_WIDTH = 280; // 每列最小宽度（px）

interface MasonryGridCSSProps {
  children: React.ReactNode;
  className?: string;
  minColumns?: number;
}

/**
 * CSS Grid Masonry 版本（Chrome 117+, Firefox 87+）
 * 
 * 优势：
 * - 零 JavaScript，完全由浏览器原生处理
 * - 极致性能，无需测量和计算
 * - 无闪烁、无抖动
 * 
 * 劣势：
 * - 浏览器兼容性（需要 Chrome 117+）
 * - 列顺序可能不符合预期（先填充列，而非逐行）
 * 
 * 降级方案：
 * - 不支持 masonry 的浏览器会回退到普通 grid 布局
 */
export default function MasonryGridCSS({ 
  children, 
  className = '', 
  minColumns = DEFAULT_MIN_COLUMNS 
}: MasonryGridCSSProps) {
  
  // 动态计算列数（CSS 变量方式）
  React.useEffect(() => {
    const updateColumns = () => {
      const containerWidth = window.innerWidth - 64; // 减去左右 padding
      let cols = Math.floor(containerWidth / MIN_COLUMN_WIDTH);
      cols = Math.max(minColumns, Math.min(MAX_COLUMNS, cols));
      
      document.documentElement.style.setProperty('--masonry-columns', String(cols));
    };
    
    updateColumns();
    window.addEventListener('resize', updateColumns);
    
    return () => window.removeEventListener('resize', updateColumns);
  }, [minColumns]);

  return (
    <div className={`masonry-grid-css ${className}`}>
      {children}
    </div>
  );
}

