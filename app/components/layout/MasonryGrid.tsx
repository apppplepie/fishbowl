'use client';

import React, { useEffect, useImperativeHandle, useRef } from 'react';
import './MasonryGrid.css';

export interface MasonryLayoutInfo {
  containerWidth: number;
  columns: number;
  columnWidth: number;
}

interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
  /** 最小列数，如 2 则窄屏也保持至少 2 列 */
  minColumns?: number;
  onLayoutChange?: (info: MasonryLayoutInfo) => void;
}

/**
 * 纯 CSS 瀑布流：auto-fill + minmax，span 由服务端预计算，无需 JS 测量
 */
const MasonryGrid = React.forwardRef<HTMLDivElement, MasonryGridProps>(
  ({ children, className = '', minColumns, onLayoutChange }, ref) => {
    const gridRef = useRef<HTMLDivElement | null>(null);
    useImperativeHandle(ref, () => gridRef.current);

    useEffect(() => {
      if (!onLayoutChange) return;
      const grid = gridRef.current;
      if (!grid) return;

      const update = () => {
        const computed = window.getComputedStyle(grid);
        const columns = computed.gridTemplateColumns.split(' ').filter(Boolean);
        const containerWidth = grid.clientWidth || grid.offsetWidth || 0;
        const gap = parseFloat(computed.columnGap || '0');
        const columnsCount = columns.length || 1;

        let columnWidth = parseFloat(columns[0] ?? '');
        if (!Number.isFinite(columnWidth) || columnWidth <= 0) {
          const gapPx = Number.isFinite(gap) ? gap : 0;
          columnWidth = containerWidth > 0
            ? (containerWidth - (columnsCount - 1) * gapPx) / columnsCount
            : 0;
        }

        if (columnWidth > 0) {
          onLayoutChange({ containerWidth, columns: columnsCount, columnWidth });
        }
      };

      update();
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
      if (ro) ro.observe(grid);
      window.addEventListener('resize', update);
      return () => {
        ro?.disconnect();
        window.removeEventListener('resize', update);
      };
    }, [onLayoutChange]);

    const minColsClass = minColumns && minColumns >= 2 ? ' masonry-grid--min-2-cols' : '';
    return (
      <div ref={gridRef} className={`masonry-grid${minColsClass} ${className}`.trim()}>
        {children}
      </div>
    );
  }
);

MasonryGrid.displayName = 'MasonryGrid';

export default MasonryGrid;
