'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import './MasonryGrid.css';

// 精简版 MasonryGrid：只负责列数计算和动态项观察
const DEFAULT_MIN_COLUMNS = 1;
const MAX_COLUMNS = 4;
const MIN_COLUMN_WIDTH = 280;

interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
  minColumns?: number;
}

export default function MasonryGrid({
  children,
  className = '',
  minColumns = DEFAULT_MIN_COLUMNS,
}: MasonryGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const containerRoRef = useRef<ResizeObserver | null>(null);
  const dynamicItemsRoRef = useRef<ResizeObserver | null>(null);
  const columnsRef = useRef(3);
  const childrenCount = useMemo(() => React.Children.count(children), [children]);

  // 计算列数
  const calculateColumns = (containerWidth: number): number => {
    let cols = Math.floor(containerWidth / MIN_COLUMN_WIDTH);
    cols = Math.max(minColumns, Math.min(MAX_COLUMNS, cols));
    return cols;
  };

  // 更新列数
  const updateColumns = (grid: HTMLElement) => {
    const containerWidth = grid.offsetWidth || grid.clientWidth;
    const newColumns = calculateColumns(containerWidth);
    if (newColumns !== columnsRef.current) {
      columnsRef.current = newColumns;
      grid.style.setProperty('--masonry-columns', String(newColumns));
    }
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

  // 初始化
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const doInit = () => {
      const containerWidth = grid.offsetWidth;
      if (containerWidth === 0) {
        requestAnimationFrame(doInit);
        return;
      }

      updateColumns(grid);
      setupDynamicItemsObserver(grid);
      grid.dataset.ready = 'true';
    };

    // 容器大小变化观察器
    if (typeof ResizeObserver !== 'undefined') {
      const containerRo = new ResizeObserver(() => {
        updateColumns(grid);
      });
      containerRoRef.current = containerRo;
      containerRo.observe(grid);
    } else {
      // fallback
      const onResize = () => updateColumns(grid);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    doInit();

    return () => {
      containerRoRef.current?.disconnect();
      dynamicItemsRoRef.current?.disconnect();
    };
  }, [minColumns]);

  // 子元素变化时重新设置观察器
  useEffect(() => {
    const grid = gridRef.current;
    if (grid) {
      updateColumns(grid);
      setupDynamicItemsObserver(grid);
    }
  }, [childrenCount, minColumns]);

  return (
    <div ref={gridRef} className={`masonry-grid ${className}`}>
      {children}
    </div>
  );
}