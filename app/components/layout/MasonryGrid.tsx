'use client';

import React, { useEffect, useRef } from 'react';
import './MasonryGrid.css';

// --- 配置常量 ---
const SPAN_TOLERANCE_PIXELS = 2; // 容忍 2px 以内的微小高度变化，防止高分屏下的次像素抖动
const DEFAULT_MIN_COLUMNS = 1; // 默认最少列数
const MAX_COLUMNS = 4; // 最多列数
const MIN_COLUMN_WIDTH = 280; // 每列最小宽度（px）
const VIEWPORT_MARGIN = '400px'; // IntersectionObserver 的提前加载距离

interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
  minColumns?: number; // 允许外部控制最小列数
}

export default function MasonryGrid({ children, className = '', minColumns = DEFAULT_MIN_COLUMNS }: MasonryGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const containerRoRef = useRef<ResizeObserver | null>(null); // 容器级别的 ResizeObserver
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const columnsRef = useRef(3); // 使用 ref 避免依赖循环
  const measuredItemsRef = useRef<Set<HTMLElement>>(new Set()); // 已测量的元素集合

  // --- 动态计算列数 ---
  const calculateColumns = (containerWidth: number): number => {
    // CSS Grid 的 fr 单位会自动处理 gap，所以只需基于最小列宽计算
    let cols = Math.floor(containerWidth / MIN_COLUMN_WIDTH);
    // 限制在 minColumns 和 MAX_COLUMNS 之间
    cols = Math.max(minColumns, Math.min(MAX_COLUMNS, cols));
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
  // 优化方案3：首次测量后缓存，标记已测量的元素
  const applySpanIfNeeded = (el: HTMLElement, newSpan: number, measuredHeight: number, isFirstMeasure = false) => {
    // 1. 读取缓存
    const prevSpan = parseInt(el.dataset.span || '0', 10);
    const prevH = parseFloat(el.dataset.h || '0');

    // 2. 核心防抖：如果 Span 没变，绝对不操作 DOM
    if (!Number.isNaN(prevSpan) && prevSpan === newSpan) {
      // 即使 span 没变，也更新一下高度缓存，保持数据新鲜
      el.dataset.h = String(measuredHeight);
      
      // ✅ 首次测量成功，标记为已测量
      if (isFirstMeasure && !measuredItemsRef.current.has(el)) {
        measuredItemsRef.current.add(el);
        el.dataset.measured = 'true';
      }
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
    if (el.dataset.ready !== 'true') {
        el.dataset.ready = 'true';
    }
    
    // ✅ 首次测量成功，标记为已测量
    if (isFirstMeasure && !measuredItemsRef.current.has(el)) {
      measuredItemsRef.current.add(el);
      el.dataset.measured = 'true';
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

  // ✅ 方案3：只测量未测量过的元素（首次测量后缓存）
  const calculateAll = (grid: HTMLElement, forceRecalculate = false) => {
    if (!grid) return;
    const allItems = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
    if (!allItems.length) return;

    // ✅ 只测量未测量过的元素（除非强制重新计算）
    const items = forceRecalculate 
      ? allItems 
      : allItems.filter(item => !measuredItemsRef.current.has(item));
    
    if (!items.length) return; // 所有元素都已测量

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

      // 批量写入 (Write)
      updates.forEach(({ item, span, h }) => {
        if (span > 0) {
          applySpanIfNeeded(item, span, h, !forceRecalculate); // 标记为首次测量
        }
      });
    });
  };

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // 初始化列数
    updateColumns(grid);

    // ✅ 初始测量所有元素
    const initRaf = requestAnimationFrame(() => calculateAll(grid));

    // ✅ 方案6：粗粒度 ResizeObserver - 只观察容器本身
    if (typeof ResizeObserver !== 'undefined') {
      const containerRo = new ResizeObserver(() => {
        // 容器尺寸变化时，强制重新计算所有元素
        requestAnimationFrame(() => {
          calculateAll(grid, true); // forceRecalculate = true
        });
      });
      containerRoRef.current = containerRo;
      containerRo.observe(grid);
    }

    // ✅ 方案2：Intersection-based 懒测量
    // 只测量进入视口附近的元素，离开视口的元素不再监听
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const item = entry.target as HTMLElement;
            
            if (entry.isIntersecting) {
              // ✅ 元素进入视口，测量一次
              if (!measuredItemsRef.current.has(item)) {
                const { rowHeight, rowGap } = getGridMetrics(grid);
                const unit = rowHeight + rowGap || 1;
                const children = Array.from(item.children) as HTMLElement[];
                
                if (children.length > 0) {
                  const h = Math.max(...children.map(c => c.getBoundingClientRect().height));
                  if (h > 0) {
                    const span = Math.ceil((h + rowGap) / unit);
                    applySpanIfNeeded(item, span, h, true); // 首次测量
                  }
                }
              }
            }
          });
        },
        {
          root: null,
          rootMargin: VIEWPORT_MARGIN, // 提前 400px 加载
          threshold: 0,
        }
      );
      
      intersectionObserverRef.current = io;
      
      // 观察所有卡片
      const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
      items.forEach((item) => io.observe(item));
    }

    // ✅ MutationObserver - 监听新增/删除的卡片
    const mo = new MutationObserver((mutations) => {
      let shouldRecalc = false;
      const added: HTMLElement[] = [];
      
      mutations.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.classList.contains('masonry-item')) {
            added.push(n);
            shouldRecalc = true;
            
            // 新增元素立即加入 IntersectionObserver
            intersectionObserverRef.current?.observe(n);
          }
        });
        m.removedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.classList.contains('masonry-item')) {
            // 从已测量集合中移除
            measuredItemsRef.current.delete(n);
            intersectionObserverRef.current?.unobserve(n);
          }
        });
      });
      
      if (shouldRecalc) calculateAll(grid);
    });
    
    mo.observe(grid, { childList: true, subtree: false }); // 只观察直接子节点

    // ✅ 窗口 resize - 更新列数并强制重新计算
    const handleGridResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = window.setTimeout(() => {
        updateColumns(grid); // 先更新列数
        
        // 列数变化时需要强制重新计算所有元素
        measuredItemsRef.current.clear(); // 清空已测量标记
        const allItems = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
        allItems.forEach(item => item.dataset.measured = 'false');
        
        calculateAll(grid, true); // 强制重新计算
      }, 150);
    };
    window.addEventListener('resize', handleGridResize);

    return () => {
      window.removeEventListener('resize', handleGridResize);
      mo.disconnect();
      containerRoRef.current?.disconnect();
      intersectionObserverRef.current?.disconnect();
      cancelAnimationFrame(initRaf);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      measuredItemsRef.current.clear();
    };
  }, [minColumns]);

  // ✅ 方案1：不克隆 children，直接渲染
  // 调用方负责给每个 child 添加 'masonry-item' className
  return (
    <div ref={gridRef} className={`masonry-grid ${className}`}>
      {children}
    </div>
  );
}
