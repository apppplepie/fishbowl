'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, memo, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { message } from '@/app/components/ui/compat';
import { Spin, Empty, LoadEnd } from '@/app/components/ui';
import { useRouter } from 'next/navigation';
import { usePageShell, DEFAULT_SCROLL_SNAP_VH } from '@/app/contexts/PageShellContext';
import { useScrollSnapAtTop } from '@/app/hooks/useScrollSnapAtTop';
import DrawingGalleryCard from '../components/cards/DrawingGalleryCard';
import MasonryWall from '../components/layout/MasonryWall';
import GalleryPublishFloat from '../components/float/GalleryPublishFloat';
import { apiGet } from '@/lib/apiClient';
import { useAccessFilter } from '@/app/hooks/useAccessFilter';
import { useAuth } from '@/app/hooks/useAuth';
import {
  getContainerWidthFromScreenWidth,
  getColumnWidthFromContainerWidth,
  getAspectRatioFromArticle,
} from '@/lib/masonry-server-utils';

const MemoCard = memo(DrawingGalleryCard);

export default function GalleryPage() {
  const router = useRouter();
  const { setConfig } = usePageShell();
  const { filterMode } = useAccessFilter();
  const { user, isLoggedIn } = useAuth();

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  // 瀑布流容器宽度：用真实 DOM 测量，避免从 book 等页导航过来时父级尚未布局导致列宽异常变窄
  const masonryWrapRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(() =>
    typeof window !== 'undefined' ? getContainerWidthFromScreenWidth(window.innerWidth) : 1400
  );
  // 一键配置整页 15vh 吸附（box1 高度、进入滚动、接近吸附 都由 scrollSnapVh 统一控制）
  useEffect(() => {
    setConfig((prev) => ({ ...prev, scrollSnapVh: DEFAULT_SCROLL_SNAP_VH }));
    return () => setConfig((prev) => ({ ...prev, scrollSnapVh: undefined }));
  }, [setConfig]);

  useScrollSnapAtTop();

  useEffect(() => {
    const el = masonryWrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (Number.isFinite(w) && w > 0) setContainerWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // 导航进入时首帧可能为 0，延迟再测一次
    const t = setTimeout(update, 100);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);
  const columnWidth = useMemo(
    () => getColumnWidthFromContainerWidth(containerWidth),
    [containerWidth]
  );

  const ITEMS_PER_PAGE = 20;

  const stateRef = useRef({ offset, loading, loadingMore, hasMore });
  useEffect(() => {
    stateRef.current = { offset, loading, loadingMore, hasMore };
  }, [offset, loading, loadingMore, hasMore]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  useEffect(() => {
    loadingRef.current = loading || loadingMore;
  }, [loading, loadingMore]);

  const fetchDrawingArticles = useCallback(async (currentOffset: number, isAppend = false) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (isAppend) setLoadingMore(true);
      else {
        setLoading(true);
        setArticles([]);
      }

      const res = await apiGet(`/api/articles/drawing?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`, {
        signal: controller.signal
      });
      
      const data = await res.json();
      if (data.success) {
        // 用 startTransition 标记为非紧急更新，避免阻塞导航等用户操作
        startTransition(() => {
          setArticles(prev => {
            if (!isAppend) return data.articles;
            const ids = new Set(prev.map(a => a.id));
            return [...prev, ...data.articles.filter((a: any) => !ids.has(a.id))];
          });
          setOffset(currentOffset + data.articles.length);
          setHasMore(data.articles.length === ITEMS_PER_PAGE);
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') message.error('获取作品失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);
  
  // 初始化与观察器
  useEffect(() => {
    fetchDrawingArticles(0, false);
    return () => abortControllerRef.current?.abort();
  }, [fetchDrawingArticles]);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || loadingRef.current || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingRef.current) {
        const { offset: currentOffset, hasMore: more } = stateRef.current;
        if (more) fetchDrawingArticles(currentOffset, true);
      }
    }, { rootMargin: '600px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, fetchDrawingArticles]);

  // 前端过滤：学习模式 = full_access_level===1；未开学习模式 = visible_access_level<=2（即 userLevel>=visibleLevel，游客默认 2）
  const userLevel = useMemo(() => (isLoggedIn && user) ? (user.max_access_level ?? 2) : 2, [isLoggedIn, user]);
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const visibleLevel = article.visible_access_level ?? article.max_access_level ?? 1;
      const fullLevel = article.full_access_level ?? visibleLevel;
      if (filterMode === 'study') return fullLevel === 1;
      if (filterMode === 'strict') return userLevel >= fullLevel;
      return userLevel >= visibleLevel;
    });
  }, [articles, filterMode, userLevel]);

  const handleImageClick = async (article: any) => {
    if (article.blocks?.length) {
      setSelectedArticle(article);
      return;
    }
    try {
      const res = await apiGet(`/api/articles/${article.id}`);
      const data = await res.json();
      if (data.success) {
        const full = { ...article, blocks: data.article.blocks };
        setArticles(prev => prev.map(a => a.id === article.id ? full : a));
        setSelectedArticle(full);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div ref={masonryWrapRef} style={{ padding: '0 8px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" /></div>
      ) : filteredArticles.length === 0 ? (
        <Empty icon=" " title="还没有作品" />
      ) : (
        <>
          <MasonryWall>
            {filteredArticles.map((article) => {
              const ar = getAspectRatioFromArticle(article);
              const coverWidth = columnWidth;
              const coverHeight = columnWidth / (Number.isFinite(ar) && ar > 0 ? ar : 3 / 2);
              return (
                <div
                  key={article.id}
                  className="masonry-item"
                  style={{
                    gridRowEnd: `span ${article.precomputedSpan ?? 1}`,
                  }}
                >
                  <MemoCard
                    article={article}
                    coverOnly
                    coverWidth={coverWidth}
                    coverHeight={coverHeight}
                    onClick={() => handleImageClick(article)}
                  />
                </div>
              );
            })}
          </MasonryWall>
          {hasMore && (
            <div ref={sentinelRef} style={{ padding: '20px', textAlign: 'center' }}>
              {loadingMore && <Spin size="small" />}
            </div>
          )}
          {!hasMore && filteredArticles.length > 0 && <LoadEnd message="没有更多作品了" />}
        </>
      )}

      {/* 弹窗用 Portal 挂到 body，避免被 PageShell/波浪的堆叠上下文盖住 */}
      {selectedArticle && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
          onClick={() => setSelectedArticle(null)}
        >
          <div style={{ width: '100%', maxWidth: '900px', position: 'relative', zIndex: 2001 }} onClick={e => e.stopPropagation()}>
            <MemoCard article={selectedArticle} onTitleClick={() => router.push(`/article/${selectedArticle.id}`)} />
          </div>
        </div>,
        document.body
      )}

      <GalleryPublishFloat onSuccess={() => fetchDrawingArticles(0, false)} />
    </div>
  );
}
