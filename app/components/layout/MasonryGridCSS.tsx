'use client';

import React, { useRef, useEffect } from 'react';
import './MasonryGridCSS.css';

// --- 配置常量 ---
const DEFAULT_MIN_COLUMNS = 1;
const MAX_COLUMNS = 4;
const MIN_COLUMN_WIDTH = 280; // 每列最小宽度（px）
const GAP_PX = 20; // 与 MasonryGridCSS.css gap 一致

export interface MasonryLayoutInfo {
  containerWidth: number;
  columns: number;
  columnWidth: number;
}

interface MasonryGridCSSProps {
  children: React.ReactNode;
  className?: string;
  minColumns?: number;
  onLayoutChange?: (info: MasonryLayoutInfo) => void;
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
  minColumns = DEFAULT_MIN_COLUMNS,
  onLayoutChange,
}: MasonryGridCSSProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const update = () => {
      const containerWidth = grid.offsetWidth || grid.clientWidth || 0;
      let cols = Math.floor(containerWidth / MIN_COLUMN_WIDTH);
      cols = Math.max(minColumns, Math.min(MAX_COLUMNS, cols));
      const columnWidth = containerWidth > 0 && cols > 0
        ? (containerWidth - (cols - 1) * GAP_PX) / cols
        : MIN_COLUMN_WIDTH;
      document.documentElement.style.setProperty('--masonry-columns', String(cols));
      onLayoutChange?.({ containerWidth, columns: cols, columnWidth });
    };

    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro) ro.observe(grid);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [minColumns, onLayoutChange]);

  return (
    <div ref={gridRef} className={`masonry-grid-css ${className}`}>
      {children}
    </div>
  );
}

