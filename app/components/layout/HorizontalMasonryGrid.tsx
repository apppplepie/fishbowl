'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import './HorizontalMasonryGrid.css';

const PAGE_SIZE = 15; // 每页15条数据

interface CardItem {
  id: number;
  title: string;
  cover_image_url?: string | null;
  [key: string]: any;
}

interface HorizontalMasonryGridProps {
  fetchPage: (page: number) => Promise<{ items: CardItem[]; hasMore: boolean }>;
  renderCard: (item: CardItem, onClick?: () => void) => React.ReactNode;
  onCardClick?: (item: CardItem) => void;
  className?: string;
}

export default function HorizontalMasonryGrid({
  fetchPage,
  renderCard,
  onCardClick,
  className = '',
}: HorizontalMasonryGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<Record<number, CardItem[]>>({});
  const [loadingPages, setLoadingPages] = useState<Record<number, boolean>>({});
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(1);
  const [maxLoadedPage, setMaxLoadedPage] = useState<number>(0);

  // 从 sessionStorage 或 history.state 读取保存的页索引
  useEffect(() => {
    const saved = (history.state && (history.state as any).pageIndex) 
      || parseInt(sessionStorage.getItem('horizontalMasonryPageIndex') || '1', 10) || 1;
    setCurrentPageIndex(saved);
  }, []);

  // 获取一页数据 - 移除 pages 和 loadingPages 依赖，避免无限循环
  const fetchPageData = useCallback(async (pageNum: number) => {
    setLoadingPages(prev => {
      // 如果正在加载，直接返回
      if (prev[pageNum]) return prev;
      return { ...prev, [pageNum]: true };
    });
    
    setPages(prev => {
      // 如果已有数据，直接返回
      if (prev[pageNum]) {
        setLoadingPages(p => ({ ...p, [pageNum]: false }));
        return prev;
      }
      return prev;
    });

    try {
      const data = await fetchPageRef.current(pageNum);
      setPages(prev => {
        const next = { ...prev, [pageNum]: data.items };
        // 持久化缓存到 sessionStorage
        try {
          sessionStorage.setItem('horizontalMasonryPagesCache', JSON.stringify(next));
        } catch (e) {
          // sessionStorage 可能已满，忽略错误
        }
        return next;
      });
      setMaxLoadedPage(prev => Math.max(prev, pageNum));
    } catch (error) {
      console.error(`Failed to fetch page ${pageNum}:`, error);
    } finally {
      setLoadingPages(prev => ({ ...prev, [pageNum]: false }));
    }
  }, []); // 移除所有依赖

  // 使用 ref 来追踪 fetchPage 函数，避免在依赖中直接使用
  const fetchPageRef = useRef(fetchPage);
  useEffect(() => {
    fetchPageRef.current = fetchPage;
  }, [fetchPage]);

  // 初始化：恢复缓存并加载当前页及相邻页
  useEffect(() => {
    // 恢复缓存的页面数据
    try {
      const raw = sessionStorage.getItem('horizontalMasonryPagesCache');
      if (raw) {
        const parsed = JSON.parse(raw);
        setPages(parsed);
        const keys = Object.keys(parsed).map(k => parseInt(k, 10));
        if (keys.length) setMaxLoadedPage(Math.max(...keys));
      }
    } catch (e) {
      // 忽略解析错误
    }

    // 确保当前页及相邻页已加载
    fetchPageData(currentPageIndex);
    if (currentPageIndex > 1) fetchPageData(currentPageIndex - 1);
    fetchPageData(currentPageIndex + 1);
  }, [currentPageIndex, fetchPageData]);

  // 使用 IntersectionObserver 预加载下一页
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const pageIdx = Number((e.target as HTMLElement).dataset.page);
            // 预加载下一页
            fetchPageData(pageIdx + 1);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    const pageEls = container.querySelectorAll('.hm-page-block');
    pageEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pages, maxLoadedPage, fetchPageData]);

  // 将一页的数据分配到列中 - 真正的瀑布流：按顺序排列，排满一列换下一列
  // 每列预估可容纳的卡片数（根据平均卡片高度估算）
  function distributeToColumns(items: CardItem[]): CardItem[][] {
    const columns: CardItem[][] = [];
    const CARDS_PER_COLUMN = 5; // 每列大约5-6张卡片（根据实际卡片高度调整）
    
    let currentColumn: CardItem[] = [];
    items.forEach((item, index) => {
      currentColumn.push(item);
      
      // 每列最多 CARDS_PER_COLUMN 张卡片，然后换列
      if (currentColumn.length >= CARDS_PER_COLUMN || index === items.length - 1) {
        columns.push([...currentColumn]);
        currentColumn = [];
      }
    });
    
    // 如果最后还有剩余卡片
    if (currentColumn.length > 0) {
      columns.push(currentColumn);
    }
    
    return columns;
  }

  // 处理卡片点击，保存当前页索引
  const handleCardClick = useCallback((item: CardItem) => {
    // 保存当前页索引
    history.replaceState(
      { ...(history.state || {}), pageIndex: currentPageIndex },
      ''
    );
    sessionStorage.setItem('horizontalMasonryPageIndex', String(currentPageIndex));
    onCardClick?.(item);
  }, [currentPageIndex, onCardClick]);

  // 计算需要渲染的页数
  const renderPages: number[] = [];
  const upto = Math.max(maxLoadedPage, currentPageIndex);
  for (let p = 1; p <= Math.max(upto, currentPageIndex + 1); p++) {
    renderPages.push(p);
  }

  // 当页面数据加载完成后，滚动到当前页
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pages[currentPageIndex]) return;

    // 等待一帧，确保 DOM 已布局
    requestAnimationFrame(() => {
      const pageEls = container.querySelectorAll('.hm-page-block');
      const idx = currentPageIndex - 1;
      if (pageEls[idx]) {
        const el = pageEls[idx] as HTMLElement;
        container.scrollLeft = el.offsetLeft;
      }
    });
  }, [pages, currentPageIndex]);

  return (
    <div className={`hm-viewport ${className}`} ref={containerRef}>
      <div className="hm-pages-row">
        {renderPages.map((p) => (
          <div className="hm-page-block" data-page={p} key={p}>
            {pages[p] ? (
              <div className="hm-columns">
                {/* 按顺序排列，排满一列换下一列 */}
                {distributeToColumns(pages[p]).map((colItems, ci) => (
                  <div key={ci} className="hm-column">
                    {colItems.map((item) => (
                      <div key={item.id} className="hm-card-wrap">
                        {renderCard(item, () => handleCardClick(item))}
                      </div>
                    ))}
                    {/* 列底部间距 */}
                    <div style={{ height: 12 }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="hm-page-loading">
                {loadingPages[p] ? `加载第 ${p} 页...` : '等待加载...'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

