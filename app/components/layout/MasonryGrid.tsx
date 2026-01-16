'use client';

import React, { useEffect, useRef, useState } from 'react';
import './MasonryGrid.css';

// --- 配置常量 ---
const SPAN_TOLERANCE_PIXELS = 2; // 容忍 2px 以内的微小高度变化，防止高分屏下的次像素抖动
const MIN_COLUMNS = 2; // 最少列数
const MAX_COLUMNS = 4; // 最多列数
const MIN_COLUMN_WIDTH = 280; // 每列最小宽度（px）

interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
}

interface ChildElementProps {
  className?: string;
}

export default function MasonryGrid({ children, className = '' }: MasonryGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const columnsRef = useRef(3); // 使用 ref 避免依赖循环

  // --- 动态计算列数 ---
  const calculateColumns = (containerWidth: number): number => {
    // CSS Grid 的 fr 单位会自动处理 gap，所以只需基于最小列宽计算
    let cols = Math.floor(containerWidth / MIN_COLUMN_WIDTH);
    // 限制在 MIN_COLUMNS 和 MAX_COLUMNS 之间
    cols = Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, cols));
    return cols;
  };

  // --- 更新列数（无需 state，直接用 CSS 变量）---
  const updateColumns = (grid: HTMLElement) => {
    const containerWidth = grid.offsetWidth - 32; // 减去左右 padding
    const newColumns = calculateColumns(containerWidth);
    if (newColumns !== columnsRef.current) {
      columnsRef.current = newColumns;
      // 更新 CSS 变量
      grid.style.setProperty('--masonry-columns', String(newColumns));
      // 列数变化后需要重新计算布局
      calculateAll(grid);
    }
  };

  // --- Helper: 智能写入 Span ---
  // 将你写的逻辑封装在这里，逻辑非常清晰
  const applySpanIfNeeded = (el: HTMLElement, newSpan: number, measuredHeight: number) => {
    // 1. 读取缓存
    const prevSpan = parseInt(el.dataset.span || '0', 10);
    const prevH = parseFloat(el.dataset.h || '0');

    // 2. 核心防抖：如果 Span 没变，绝对不操作 DOM
    if (!Number.isNaN(prevSpan) && prevSpan === newSpan) {
      // 即使 span 没变，也更新一下高度缓存，保持数据新鲜
      el.dataset.h = String(measuredHeight);
      return;
    }

    // 3. 核心抗干扰：如果高度变化极小（例如 < 2px），忽略此次变化
    // 这能有效防止浏览器在次像素渲染时的计算抖动
    if (!Number.isNaN(prevH) && Math.abs(prevH - measuredHeight) <= SPAN_TOLERANCE_PIXELS) {
      // 甚至不更新缓存，直接忽略这次微小的扰动
      return;
    }

    // 4. 执行写入
    const finalSpan = Math.max(newSpan, 1);
    el.style.gridRowEnd = `span ${finalSpan}`;
    
    // 更新缓存状态
    el.dataset.span = String(finalSpan);
    el.dataset.h = String(measuredHeight);
    
    // 标记为 ready，配合 CSS 做淡入动画
    // CSS 写法: .masonry-item[data-ready="true"] { opacity: 1; transform: none; }
    if (el.dataset.ready !== 'true') {
        el.dataset.ready = 'true';
    }
  };

  const getGridMetrics = (grid: HTMLElement) => {
    const style = getComputedStyle(grid);
    const rowHeight = parseFloat(style.getPropertyValue('grid-auto-rows')) || 10;
    const rowGap =
      parseFloat(style.getPropertyValue('row-gap')) ||
      parseFloat(style.getPropertyValue('grid-row-gap')) ||
      0;
    return { rowHeight, rowGap };
  };

  const calculateAll = (grid: HTMLElement) => {
    if (!grid) return;
    const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
    if (!items.length) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const { rowHeight, rowGap } = getGridMetrics(grid);
      const unit = rowHeight + rowGap || 1;

      // 批量测量 (Read)
      const updates = items.map((item) => {
        const children = Array.from(item.children) as HTMLElement[];
        if (children.length === 0) return { item, span: 0, h: 0 };
        // 测量内容高度
        const h = Math.max(...children.map(child => child.getBoundingClientRect().height));
        const span = Math.ceil((h + rowGap) / unit);
        return { item, span, h };
      });

      // 批量写入 (Write) - 调用你的 Helper
      updates.forEach(({ item, span, h }) => {
        if (span > 0) {
          applySpanIfNeeded(item, span, h);
        }
      });
    });
  };

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // 初始化列数
    updateColumns(grid);

    const initRaf = requestAnimationFrame(() => calculateAll(grid));

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        if (!grid) return;
        requestAnimationFrame(() => {
            const { rowHeight, rowGap } = getGridMetrics(grid);
            const unit = rowHeight + rowGap || 1;

            entries.forEach((e) => {
                const el = e.target as HTMLElement;
                // 确保只处理 item 且有内容
                if (!el.classList.contains('masonry-item')) return;
                
                const children = Array.from(el.children) as HTMLElement[];
                const h = children.length > 0
                    ? Math.max(...children.map(c => c.getBoundingClientRect().height))
                    : el.getBoundingClientRect().height; // 降级方案

                if (h > 0) {
                    const span = Math.ceil((h + rowGap) / unit);
                    // 调用 Helper
                    applySpanIfNeeded(el, span, h);
                }
            });
        });
      });
      roRef.current = ro;
      const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
      items.forEach((it) => ro.observe(it));
    }

    // ... MutationObserver 和 Resize 监听保持不变 ...
    const mo = new MutationObserver((mutations) => {
      let shouldRecalc = false;
      const added: HTMLElement[] = [];
      
      mutations.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.classList.contains('masonry-item')) {
             added.push(n);
             shouldRecalc = true;
          }
        });
        m.removedNodes.forEach((n) => {
             if (n instanceof HTMLElement && n.classList.contains('masonry-item')) {
                 roRef.current?.unobserve(n);
             }
        });
      });

      if (added.length && roRef.current) {
        added.forEach((a) => roRef.current?.observe(a));
      }
      
      if (shouldRecalc) calculateAll(grid);
    });
    
    mo.observe(grid, { childList: true, subtree: true });

    const handleGridResize = () => {
        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = window.setTimeout(() => {
          updateColumns(grid); // 先更新列数
          calculateAll(grid); // 再重新计算布局
        }, 150);
    };
    window.addEventListener('resize', handleGridResize);

    return () => {
      window.removeEventListener('resize', handleGridResize);
      mo.disconnect();
      roRef.current?.disconnect();
      cancelAnimationFrame(initRaf);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, []); // 无依赖，避免重复监听

  // ... Render 部分不变 ...
  return (
    <div ref={gridRef} className={`masonry-grid ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement<ChildElementProps>(child)) {
          const childClassName = child.props.className || '';
          return React.cloneElement(child, {
            className: `masonry-item ${childClassName}`.trim(),
            // 可以预先设置 ready=false，虽然 CSS 默认状态应该就是隐藏
            'data-ready': 'false' 
          } as any);
        }
        return child;
      })}
    </div>
  );
}

