'use client';

import React, { useLayoutEffect, useEffect, useRef, useMemo } from 'react';
import './MasonryGrid.css';

// 精简版 MasonryGrid：只负责列数计算和动态项观察
const DEFAULT_MIN_COLUMNS = 1;
const MAX_COLUMNS = 4;
const MIN_COLUMN_WIDTH = 280;
const GAP_PX = 8;

export interface MasonryLayoutInfo {
  containerWidth: number;
  columns: number;
  columnWidth: number;
}

interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
  minColumns?: number;
  /** 网格测量完成后回调，用于父组件算图片卡 span 等；resize 时会再次调用 */
  onLayoutChange?: (info: MasonryLayoutInfo) => void;
}

export default function MasonryGrid({
  children,
  className = '',
  minColumns = DEFAULT_MIN_COLUMNS,
  onLayoutChange,
}: MasonryGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const containerRoRef = useRef<ResizeObserver | null>(null);
  const dynamicItemsRoRef = useRef<ResizeObserver | null>(null);
  const columnsRef = useRef(0);
  const childrenCount = useMemo(() => React.Children.count(children), [children]);

  // 计算列数
  const calculateColumns = (containerWidth: number): number => {
    let cols = Math.floor(containerWidth / MIN_COLUMN_WIDTH);
    cols = Math.max(minColumns, Math.min(MAX_COLUMNS, cols));
    return cols;
  };

  // 更新列数，并通知父组件列宽（用于图片卡 span 等）
  const updateColumns = (grid: HTMLElement, fallbackWidth?: number) => {
    const containerWidth = grid.getBoundingClientRect().width || grid.offsetWidth || grid.clientWidth || fallbackWidth || 0;
    const newColumns = calculateColumns(containerWidth);
    const columnWidth = containerWidth > 0 && newColumns > 0
      ? (containerWidth - (newColumns - 1) * GAP_PX) / newColumns
      : MIN_COLUMN_WIDTH;
    if (newColumns !== columnsRef.current) {
      columnsRef.current = newColumns;
      grid.style.setProperty('--masonry-columns', String(newColumns));
    }
    onLayoutChange?.({ containerWidth, columns: newColumns, columnWidth });
  };

  // 设置动态项观察器（只观察ImageCard等动态高度项）
  const setupDynamicItemsObserver = (grid: HTMLElement) => {
    if (dynamicItemsRoRef.current) {
      dynamicItemsRoRef.current.disconnect();
    }

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (!el.hasAttribute('data-masonry')) continue;
          // 固定 span 的卡片已有 data-masonry-span，不覆盖
          if (el.hasAttribute('data-masonry-span')) continue;

          const currentRow = el.style.gridRow;
          if (currentRow && currentRow.startsWith('span ')) continue;

          el.style.gridRow = 'span 1';
          el.dataset.ready = 'true';
        }
      });

      dynamicItemsRoRef.current = ro;

      // 只观察动态高度项（无 data-masonry-span 的），固定 span 卡片不参与
      const dynamicItems = Array.from(grid.querySelectorAll<HTMLElement>('[data-masonry]:not([data-masonry-span])'));
      dynamicItems.forEach(item => ro.observe(item));
    }
  };

  // 布局初始化：useLayoutEffect 在 paint 前运行，早写 CSS 变量 + 显示前隐藏，首帧无闪动
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const containerWidth = grid.getBoundingClientRect().width || (typeof window !== 'undefined' ? window.innerWidth : 0);
    const cols = calculateColumns(containerWidth);
    columnsRef.current = cols;
    grid.style.setProperty('--masonry-columns', String(cols));
    grid.style.setProperty('--masonry-row-px', '8px');
    grid.style.setProperty('--masonry-gap-px', `${GAP_PX}px`);

    const columnWidth = containerWidth > 0 && cols > 0
      ? (containerWidth - (cols - 1) * GAP_PX) / cols
      : MIN_COLUMN_WIDTH;
    onLayoutChange?.({ containerWidth, columns: cols, columnWidth });

    setupDynamicItemsObserver(grid);
    grid.querySelectorAll<HTMLElement>('[data-masonry][data-masonry-span]').forEach((el) => {
      el.dataset.ready = 'true';
    });
    grid.dataset.ready = 'true';

    if (typeof ResizeObserver !== 'undefined') {
      const containerRo = new ResizeObserver(() => {
        updateColumns(grid);
      });
      containerRoRef.current = containerRo;
      containerRo.observe(grid);
    }

    return () => {
      containerRoRef.current?.disconnect();
      dynamicItemsRoRef.current?.disconnect();
    };
  }, [minColumns]);

  // 非 SSR 时窗口 resize 兜底（无 ResizeObserver 时）
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof ResizeObserver !== 'undefined') return;
    const onResize = () => updateColumns(grid);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [minColumns]);

  // 子元素变化时重新设置观察器，并给新挂载的固定 span 项打 ready
  useEffect(() => {
    const grid = gridRef.current;
    if (grid) {
      updateColumns(grid);
      setupDynamicItemsObserver(grid);
      grid.querySelectorAll<HTMLElement>('[data-masonry][data-masonry-span]').forEach((el) => {
        el.dataset.ready = 'true';
      });
    }
  }, [childrenCount, minColumns]);

  return (
    <div ref={gridRef} className={`masonry-grid ${className}`} data-ready={undefined}>
      {children}
    </div>
  );
}