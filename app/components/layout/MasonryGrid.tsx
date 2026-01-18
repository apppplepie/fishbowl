'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import './MasonryGrid.css';

// --- 配置常量 ---
const SPAN_TOLERANCE_PIXELS = 2; // 高度容差：2px 内的变化忽略
const DEBOUNCE_MS = 16; // RAF 防抖：~1 frame
const DEFAULT_MIN_COLUMNS = 1;
const MAX_COLUMNS = 4;
const MIN_COLUMN_WIDTH = 280;

interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
  minColumns?: number;
}

export default function MasonryGrid({ children, className = '', minColumns = DEFAULT_MIN_COLUMNS }: MasonryGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const itemsRoRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const columnsRef = useRef(3);
  
  // 🔑 核心优化：使用 WeakMap 缓存高度，避免频繁读取
  const heightCacheRef = useRef<WeakMap<HTMLElement, number>>(new WeakMap());
  const pendingUpdatesRef = useRef<Set<HTMLElement>>(new Set());
  const isApplyingRef = useRef(false); // 防止 RO 写循环
  const lastScheduleRef = useRef(0); // 防抖时间戳
  
  // 🔑 缓存 grid metrics，只在列数变化时刷新
  const metricsCacheRef = useRef<{ rowHeight: number; rowGap: number } | null>(null);
  const childrenCount = useMemo(() => React.Children.count(children), [children]);

  // --- 动态计算列数 ---
  const calculateColumns = (containerWidth: number): number => {
    let cols = Math.floor(containerWidth / MIN_COLUMN_WIDTH);
    cols = Math.max(minColumns, Math.min(MAX_COLUMNS, cols));
    return cols;
  };

  // --- 🔑 缓存 grid metrics，避免频繁读取 computed style ---
  const getGridMetrics = (grid: HTMLElement, force = false) => {
    if (!force && metricsCacheRef.current) {
      return metricsCacheRef.current;
    }
    const style = getComputedStyle(grid);
    metricsCacheRef.current = {
      rowHeight: parseFloat(style.getPropertyValue('grid-auto-rows')) || 10,
      rowGap: parseFloat(style.getPropertyValue('row-gap')) || 
              parseFloat(style.getPropertyValue('grid-row-gap')) || 0,
    };
    return metricsCacheRef.current;
  };

  // --- 更新列数 ---
  const updateColumns = (grid: HTMLElement) => {
    const containerWidth = grid.offsetWidth;
    const newColumns = calculateColumns(containerWidth);
    if (newColumns !== columnsRef.current) {
      columnsRef.current = newColumns;
      grid.style.setProperty('--masonry-columns', String(newColumns));
      
      // 🔑 列数变化时清空 metrics 缓存
      metricsCacheRef.current = null;
      
      // 重新测量所有卡片
      const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
      items.forEach(item => scheduleUpdate(item));
    }
  };

  // --- 🔑 批量 RAF 写入：打断 RO → 写 → RO 循环 ---
  const applyPending = (grid: HTMLElement) => {
    if (pendingUpdatesRef.current.size === 0) return;
    
    // 🔑 设置标志，防止 RO 回调在写入时再次触发
    isApplyingRef.current = true;
    
    const { rowHeight, rowGap } = getGridMetrics(grid);
    const unit = rowHeight + rowGap || 1;
    
    // 批量写入
    const getItemHeight = (el: HTMLElement) => {
      // 🔑 grid-auto-rows 会限制元素高度，优先用 scrollHeight 拿真实内容高度
      const scrollH = el.scrollHeight;
      if (scrollH > 0) return scrollH;
      return el.getBoundingClientRect().height;
    };

    for (const el of Array.from(pendingUpdatesRef.current)) {
      const maxH = getItemHeight(el);
      
      // 🔑 高度为0，跳过不处理（保持隐藏）
      if (maxH <= 0) continue;
      
      const span = Math.max(1, Math.ceil((maxH + rowGap) / unit));
      const prevH = heightCacheRef.current.get(el) || 0;
      const prevSpan = el.style.gridRowEnd;
      
      // 🔑 容差判断：只在高度变化超过容差或 span 不同时写入
      if (Math.abs(prevH - maxH) > SPAN_TOLERANCE_PIXELS || prevSpan !== `span ${span}`) {
        el.style.gridRowEnd = `span ${span}`;
        heightCacheRef.current.set(el, maxH);
        el.dataset.ready = 'true'; // 只有设置了 span 才显示
      }
    }
    
    pendingUpdatesRef.current.clear();
    isApplyingRef.current = false;
  };

  // --- 节流调度：防抖 + RAF 合并 ---
  const scheduleUpdate = (item: HTMLElement) => {
    const grid = gridRef.current;
    if (!grid) return;
    
    pendingUpdatesRef.current.add(item);
    
    const now = performance.now();
    // 🔑 防抖：距离上次调度不到 16ms 且已有 RAF，直接返回
    if (now - lastScheduleRef.current < DEBOUNCE_MS && rafRef.current) return;
    
    lastScheduleRef.current = now;
    if (rafRef.current) return;
    
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      applyPending(grid);
    });
  };

  // --- 🔑 初始化：断开 RO → 批量测量 → 写入 → 恢复观察 ---
  const calculateInitial = (grid: HTMLElement) => {
    const ro = itemsRoRef.current;
    if (ro) ro.disconnect();
    
    const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
    if (!items.length) {
      if (ro) {
        items.forEach(it => ro.observe(it));
      }
      return;
    }
    
    const { rowHeight, rowGap } = getGridMetrics(grid, true);
    const unit = rowHeight + rowGap || 1;
    
    let zeroHeightCount = 0;
    
    // 批量测量和写入
    const getItemHeight = (el: HTMLElement) => {
      const scrollH = el.scrollHeight;
      if (scrollH > 0) return scrollH;
      return el.getBoundingClientRect().height;
    };

    for (const item of items) {
      // 🔑 暂时移除隐藏状态以获取准确的高度
      const wasHidden = item.style.visibility === 'hidden' || getComputedStyle(item).visibility === 'hidden';
      if (wasHidden) {
        item.style.visibility = 'visible';
        item.style.opacity = '0'; // 保持视觉上的隐藏
      }
      
      const h = getItemHeight(item);
      
      // 🔑 只有高度 > 0 才设置 span 和显示
      if (h > 0) {
        const span = Math.max(1, Math.ceil((h + rowGap) / unit));
        item.style.gridRowEnd = `span ${span}`;
        heightCacheRef.current.set(item, h);
        item.dataset.ready = 'true'; // 触发 CSS 显示（会设置 opacity: 1）
        item.style.opacity = ''; // 清除临时的 opacity
      } else {
        // 🔑 高度为0，恢复隐藏状态
        if (wasHidden) {
          item.style.visibility = 'hidden';
          item.style.opacity = '';
        }
        zeroHeightCount++;
      }
    }
    
    // 🔑 如果检测到零高度，延迟重试（增加延迟时间）
    if (zeroHeightCount > 0) {
      console.warn(`[MasonryGrid] 初始测量发现 ${zeroHeightCount} 个零高度卡片，将在 200ms 后重试`);
      setTimeout(() => {
        retryZeroHeightItems(grid);
      }, 200);
    }
    
    // 标记 grid 已准备好，整体淡入
    if (grid.dataset.ready !== 'true') {
      grid.dataset.ready = 'true';
    }

    // 恢复观察
    if (ro) {
      items.forEach(it => ro.observe(it));
    }
  };

  // --- 🔑 重试机制：只测量零高度的卡片 ---
  const retryZeroHeightItems = (grid: HTMLElement) => {
    const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
    const { rowHeight, rowGap } = getGridMetrics(grid);
    const unit = rowHeight + rowGap || 1;
    
    let stillZero = 0;
    
    const getItemHeight = (el: HTMLElement) => {
      const scrollH = el.scrollHeight;
      if (scrollH > 0) return scrollH;
      return el.getBoundingClientRect().height;
    };

    for (const item of items) {
      // 只重试还没有 ready 的卡片
      if (item.dataset.ready !== 'true') {
        const h = getItemHeight(item);
        
        if (h > 0) {
          const span = Math.max(1, Math.ceil((h + rowGap) / unit));
          item.style.gridRowEnd = `span ${span}`;
          heightCacheRef.current.set(item, h);
          item.dataset.ready = 'true';
        } else {
          stillZero++;
        }
      }
    }
    
    // 如果还有零高度，再次延迟重试（最多重试2次）
    if (stillZero > 0 && stillZero < items.length) {
      console.warn(`[MasonryGrid] 重试后仍有 ${stillZero} 个零高度卡片，200ms 后最后一次重试`);
      setTimeout(() => {
        retryZeroHeightItems(grid);
      }, 200);
    }
  };

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // 初始化列数
    updateColumns(grid);

    // 🔑 多重 RAF：确保 DOM、样式、字体都已加载
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          calculateInitial(grid);
        });
      });
    });

    // 🔑 ResizeObserver：使用 entry 数据，容差判断，防循环
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        // 🔑 防止 RO 写循环：如果正在批量写入，忽略本次回调
        if (isApplyingRef.current) return;
        
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (!el.classList.contains('masonry-item')) continue;
          
          // 🔑 优先读取 RO 提供的数据，避免额外的 getBoundingClientRect()
          let h = 0;
          try {
            // @ts-ignore - borderBoxSize 可能是数组或对象
            if (entry.borderBoxSize) {
              const boxSize = Array.isArray(entry.borderBoxSize) 
                ? entry.borderBoxSize[0] 
                : entry.borderBoxSize;
              h = boxSize?.blockSize || entry.contentRect?.height || 0;
            } else if (entry.contentRect) {
              h = entry.contentRect.height;
            } else {
              // 降级方案
              h = el.getBoundingClientRect().height;
            }
          } catch (e) {
            h = el.getBoundingClientRect().height;
          }
          
          const prevH = heightCacheRef.current.get(el) || 0;
          
          // 🔑 容差判断：只在高度变化超过容差时才调度更新
          if (Math.abs(prevH - h) > SPAN_TOLERANCE_PIXELS) {
            scheduleUpdate(el);
          }
        }
      });
      
      itemsRoRef.current = ro;
      
      // 监听所有现有卡片
      const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
      items.forEach((item) => ro.observe(item));
    }

    // MutationObserver 处理新增/删除的卡片
    const mo = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.classList.contains('masonry-item')) {
            // 新增卡片：立即监听 + 立即测量
            itemsRoRef.current?.observe(n);
            scheduleUpdate(n);
          }
        });
        m.removedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.classList.contains('masonry-item')) {
            // 移除卡片：停止监听
            itemsRoRef.current?.unobserve(n);
            pendingUpdatesRef.current.delete(n);
          }
        });
      });
    });
    
    mo.observe(grid, { childList: true, subtree: false });

    // 窗口 resize：更新列数 + 重新测量所有卡片
    const handleResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = window.setTimeout(() => {
        updateColumns(grid);
        
        // resize 后重新测量所有卡片
        const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
        items.forEach(item => scheduleUpdate(item));
      }, 150);
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mo.disconnect();
      itemsRoRef.current?.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      pendingUpdatesRef.current.clear();
    };
  }, [minColumns]);

  // 子项数量变化时，强制重新测量，避免新增卡片未触发布局更新
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    updateColumns(grid);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        calculateInitial(grid);
      });
    });
  }, [childrenCount, minColumns]);

  // ✅ 方案1：不克隆 children，直接渲染
  // 调用方负责给每个 child 添加 'masonry-item' className
  return (
    <div ref={gridRef} className={`masonry-grid ${className}`}>
      {children}
    </div>
  );
}


