// MasonryGridWithRestore.tsx
'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import './MasonryGrid.css';

// --- 配置常量 ---
const SPAN_TOLERANCE_PIXELS = 2; // 高度容差：2px
const DEBOUNCE_MS = 16; // RAF 防抖：~1 frame
const DEFAULT_MIN_COLUMNS = 1;
const MAX_COLUMNS = 4;
const MIN_COLUMN_WIDTH = 280;
const STORAGE_KEY = 'masonry:article:scroll:v1'; // 保存位置的 key

interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
  minColumns?: number;
  // 恢复滚动参数（可选）
  restoreChunkRatio?: number; // 每次滚动屏幕比例
  restoreDelay?: number; // 每段等待 ms
}

export default function MasonryGrid({
  children,
  className = '',
  minColumns = DEFAULT_MIN_COLUMNS,
  restoreChunkRatio = 0.85,
  restoreDelay = 420,
}: MasonryGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const itemsRoRef = useRef<ResizeObserver | null>(null);
  const containerRoRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const columnsRef = useRef(3);

  // visible tracking
  const visibleMapRef = useRef<Map<string, { top: number; ts: number }>>(new Map());
  const ioRef = useRef<IntersectionObserver | null>(null);
  const autoScrollCancelRef = useRef(false);

  // height cache + scheduling
  const heightCacheRef = useRef<WeakMap<HTMLElement, number>>(new WeakMap());
  const pendingUpdatesRef = useRef<Set<HTMLElement>>(new Set());
  const isApplyingRef = useRef(false);
  const lastScheduleRef = useRef(0);

  const metricsCacheRef = useRef<{ rowHeight: number; rowGap: number } | null>(null);
  const childrenCount = useMemo(() => React.Children.count(children), [children]);

  // --- helper: calculate columns ---
  const calculateColumns = (containerWidth: number): number => {
    let cols = Math.floor(containerWidth / MIN_COLUMN_WIDTH);
    cols = Math.max(minColumns, Math.min(MAX_COLUMNS, cols));
    return cols;
  };

  const getGridMetrics = (grid: HTMLElement, force = false) => {
    if (!force && metricsCacheRef.current) return metricsCacheRef.current;
    const style = getComputedStyle(grid);
    metricsCacheRef.current = {
      rowHeight: parseFloat(style.getPropertyValue('grid-auto-rows')) || 10,
      rowGap:
        parseFloat(style.getPropertyValue('row-gap')) ||
        parseFloat(style.getPropertyValue('grid-row-gap')) ||
        0,
    };
    return metricsCacheRef.current;
  };

  const updateColumns = (grid: HTMLElement) => {
    const containerWidth = grid.offsetWidth;
    const newColumns = calculateColumns(containerWidth);
    if (newColumns !== columnsRef.current) {
      columnsRef.current = newColumns;
      grid.style.setProperty('--masonry-columns', String(newColumns));
      metricsCacheRef.current = null;
      const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
      items.forEach((item) => scheduleUpdate(item));
    }
  };

  // --- batch apply ---
  const applyPending = (grid: HTMLElement) => {
    if (pendingUpdatesRef.current.size === 0) return;
    isApplyingRef.current = true;
    const { rowHeight, rowGap } = getGridMetrics(grid);
    const unit = (rowHeight || 0) + (rowGap || 0) || 1;

    const getItemHeight = (el: HTMLElement) => {
      const scrollH = el.scrollHeight;
      if (scrollH > 0) return scrollH;
      return el.getBoundingClientRect().height;
    };

    for (const el of Array.from(pendingUpdatesRef.current)) {
      const maxH = getItemHeight(el);
      if (maxH <= 0) continue;
      const span = Math.max(1, Math.ceil((maxH + rowGap) / unit));
      const prevH = heightCacheRef.current.get(el) || 0;
      const prevSpan = el.style.gridRowEnd;
      if (Math.abs(prevH - maxH) > SPAN_TOLERANCE_PIXELS || prevSpan !== `span ${span}`) {
        el.style.gridRowEnd = `span ${span}`;
        heightCacheRef.current.set(el, maxH);
        el.dataset.ready = 'true';
      }
    }

    pendingUpdatesRef.current.clear();
    isApplyingRef.current = false;
  };

  const scheduleUpdate = (item: HTMLElement) => {
    const grid = gridRef.current;
    if (!grid) return;
    pendingUpdatesRef.current.add(item);
    const now = performance.now();
    if (now - lastScheduleRef.current < DEBOUNCE_MS && rafRef.current) return;
    lastScheduleRef.current = now;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      applyPending(grid);
    });
  };

  // --- initial calculate (reuse your original logic) ---
  const calculateInitial = (grid: HTMLElement) => {
    const ro = itemsRoRef.current;
    if (ro) ro.disconnect();
    const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
    if (!items.length) {
      if (ro) items.forEach((it) => ro.observe(it));
      return;
    }
    const { rowHeight, rowGap } = getGridMetrics(grid, true);
    const unit = rowHeight + rowGap || 1;
    let zeroHeightCount = 0;
    const getItemHeight = (el: HTMLElement) => {
      const scrollH = el.scrollHeight;
      if (scrollH > 0) return scrollH;
      return el.getBoundingClientRect().height;
    };

    for (const item of items) {
      const wasHidden =
        item.style.visibility === 'hidden' || getComputedStyle(item).visibility === 'hidden';
      if (wasHidden) {
        item.style.visibility = 'visible';
        item.style.opacity = '0';
      }
      const h = getItemHeight(item);
      if (h > 0) {
        const span = Math.max(1, Math.ceil((h + rowGap) / unit));
        item.style.gridRowEnd = `span ${span}`;
        heightCacheRef.current.set(item, h);
        item.dataset.ready = 'true';
        item.style.opacity = '';
      } else {
        if (wasHidden) {
          item.style.visibility = 'hidden';
          item.style.opacity = '';
        }
        zeroHeightCount++;
      }
    }

    if (zeroHeightCount > 0) {
      console.warn(`[MasonryGrid] 初始测量发现 ${zeroHeightCount} 个零高度卡片，将在 200ms 后重试`);
      setTimeout(() => {
        retryZeroHeightItems(grid);
      }, 200);
    }

    if (grid.dataset.ready !== 'true') grid.dataset.ready = 'true';
    if (ro) items.forEach((it) => ro.observe(it));
  };

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

    if (stillZero > 0 && stillZero < items.length) {
      console.warn(
        `[MasonryGrid] 重试后仍有 ${stillZero} 个零高度卡片，200ms 后最后一次重试`
      );
      setTimeout(() => {
        retryZeroHeightItems(grid);
      }, 200);
    }
  };

  // --- progressive scroll to target ---
  const progressiveScrollTo = async (target: number, chunkRatio = restoreChunkRatio, delay = restoreDelay) => {
    autoScrollCancelRef.current = false;
    const vh = window.innerHeight;
    const chunk = Math.max(200, Math.round(vh * chunkRatio));
    let cur = window.scrollY;
    const dir = target > cur ? 1 : -1;

    const userInterruptOnce = () => {
      autoScrollCancelRef.current = true;
    };

    // user interrupt listeners
    window.addEventListener('wheel', userInterruptOnce, { passive: true });
    window.addEventListener('touchstart', userInterruptOnce, { passive: true });
    window.addEventListener('keydown', userInterruptOnce, { passive: true });

    try {
      while (
        !autoScrollCancelRef.current &&
        ((dir === 1 && cur < target - 2) || (dir === -1 && cur > target + 2))
      ) {
        const next = dir === 1 ? Math.min(target, cur + chunk) : Math.max(target, cur - chunk);
        window.scrollTo({ top: next, behavior: 'smooth' });
        await new Promise((r) => setTimeout(r, delay));
        cur = window.scrollY;
      }
      if (!autoScrollCancelRef.current) {
        window.scrollTo({ top: target, behavior: 'auto' });
      }
    } finally {
      // cleanup
      window.removeEventListener('wheel', userInterruptOnce);
      window.removeEventListener('touchstart', userInterruptOnce);
      window.removeEventListener('keydown', userInterruptOnce);
      autoScrollCancelRef.current = false;
    }
  };

  // --- save state (throttled) ---
  function throttle(fn: (...args: any[]) => void, wait = 250) {
    let last = 0;
    let t: any = null;
    return (...args: any[]) => {
      const now = Date.now();
      if (now - last > wait) {
        last = now;
        fn(...args);
      } else {
        clearTimeout(t);
        t = setTimeout(() => {
          last = Date.now();
          fn(...args);
        }, wait - (now - last));
      }
    };
  }

  const saveState = throttle(() => {
    try {
      // choose top-most visible item (smallest top >= -50)
      let chosenId: string | null = null;
      let chosenTop = Infinity;
      for (const [id, meta] of visibleMapRef.current.entries()) {
        // meta.top is boundingClientRect.top (relative to viewport)
        if (meta.top < chosenTop) {
          chosenTop = meta.top;
          chosenId = id;
        }
      }
      const state = {
        topItemId: chosenId,
        topItemOffset: Number.isFinite(chosenTop) && chosenTop !== Infinity ? chosenTop : 0,
        scrollY: window.scrollY,
        ts: Date.now(),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }, 250);

  // --- on mount: set up observers, listeners, restore ---
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
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            calculateInitial(grid);
            // after initial layout, attempt restore
            attemptRestore();
          });
        });
      });
    };

    // intersection observer to track visible items
    if (typeof IntersectionObserver !== 'undefined') {
      ioRef.current = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const el = e.target as HTMLElement;
            const id = el.getAttribute('data-article-id');
            if (!id) continue;
            if (e.isIntersecting) {
              visibleMapRef.current.set(id, {
                top: e.boundingClientRect ? e.boundingClientRect.top : el.getBoundingClientRect().top,
                ts: Date.now(),
              });
            } else {
              visibleMapRef.current.delete(id);
            }
          }
        },
        { root: null, threshold: [0, 0.01, 0.5] }
      );

      // observe all current items
      const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
      items.forEach((it) => {
        ioRef.current?.observe(it);
      });
    }

    // ResizeObservers
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        if (isApplyingRef.current) return;
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (!el.classList.contains('masonry-item')) continue;
          let h = 0;
          try {
            if ((entry as any).borderBoxSize) {
              const boxSize = Array.isArray((entry as any).borderBoxSize)
                ? (entry as any).borderBoxSize[0]
                : (entry as any).borderBoxSize;
              h = boxSize?.blockSize || entry.contentRect?.height || 0;
            } else if (entry.contentRect) {
              h = entry.contentRect.height;
            } else {
              h = el.getBoundingClientRect().height;
            }
          } catch {
            h = el.getBoundingClientRect().height;
          }
          const prevH = heightCacheRef.current.get(el) || 0;
          if (Math.abs(prevH - h) > SPAN_TOLERANCE_PIXELS) {
            scheduleUpdate(el);
          }
        }
      });
      itemsRoRef.current = ro;
      const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
      items.forEach((item) => ro.observe(item));

      const containerRo = new ResizeObserver((entries) => {
        if (isApplyingRef.current) return;
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (el !== grid) continue;
          updateColumns(grid);
          const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
          items.forEach((item) => scheduleUpdate(item));
        }
      });
      containerRoRef.current = containerRo;
      containerRo.observe(grid);
    }

    // MutationObserver: observe added/removed items
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.classList.contains('masonry-item')) {
            itemsRoRef.current?.observe(n);
            ioRef.current?.observe(n);
            scheduleUpdate(n);
          }
        });
        m.removedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.classList.contains('masonry-item')) {
            itemsRoRef.current?.unobserve(n);
            ioRef.current?.unobserve(n);
            pendingUpdatesRef.current.delete(n);
            heightCacheRef.current.delete(n);
          }
        });
      }
    });
    mo.observe(grid, { childList: true, subtree: false });

    // save on scroll & resize (throttled)
    const onScroll = () => saveState();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // listen for external save requests (e.g., before navigation)
    const onSaveState = () => saveState();
    window.addEventListener('masonry:saveState', onSaveState);

    // run init
    doInit();

    // attempt restore logic
    async function attemptRestore() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const st = JSON.parse(raw);
        if (!st) return;
        // wait until grid dataset.ready is true or timeout
        const waitForReady = async (timeout = 3000) => {
          const start = Date.now();
          while (Date.now() - start < timeout) {
            if (grid && grid.dataset.ready === 'true') return true;
            // if visibleMap already has entries maybe ready enough
            if (visibleMapRef.current.size > 0) return true;
            await new Promise((r) => setTimeout(r, 80));
          }
          return false;
        };
        await waitForReady(3000);

        if (st.topItemId) {
          const el = document.querySelector<HTMLElement>(`[data-article-id="${st.topItemId}"]`);
          if (el) {
            // compute desired top scroll position
            const elRect = el.getBoundingClientRect();
            const desired = window.scrollY + elRect.top - (st.topItemOffset || 0);
            // clamp
            const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            const target = Math.max(0, Math.min(desired, max));
            // progressive scroll
            await progressiveScrollTo(target, restoreChunkRatio, restoreDelay);
            return;
          }
        }

        // fallback to raw scrollY
        if (typeof st.scrollY === 'number') {
          const fallbackTarget = Math.max(0, Math.min(st.scrollY, document.documentElement.scrollHeight - window.innerHeight));
          await progressiveScrollTo(fallbackTarget, restoreChunkRatio, restoreDelay);
        }
      } catch (e) {
        // ignore
      }
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('masonry:saveState', onSaveState);
      mo.disconnect();
      itemsRoRef.current?.disconnect();
      containerRoRef.current?.disconnect();
      ioRef.current?.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      pendingUpdatesRef.current.clear();
    };
  }, [minColumns, restoreChunkRatio, restoreDelay]);

  // on childrenCount change remeasure
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

  // also save before unload (optional)
  useEffect(() => {
    const onBeforeUnload = () => saveState();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // render
  return (
    <div ref={gridRef} className={`masonry-grid ${className}`}>
      {children}
    </div>
  );
}
