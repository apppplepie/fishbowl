'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { Spin, Empty, LoadEnd } from '@/app/components/ui';
import { useRouter } from 'next/navigation';
import { usePageShell } from '@/app/contexts/PageShellContext';
import DrawingGalleryCard from '../components/cards/DrawingGalleryCard';
import GalleryPublishFloat from '../components/float/GalleryPublishFloat';
import { apiGet } from '@/lib/apiClient';
import { useAccessFilter } from '@/app/hooks/useAccessFilter';
import { useAuth } from '@/app/hooks/useAuth';

// 样式注入
if (typeof document !== 'undefined') {
  const styleId = 'gallery-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes fadeIn { 
        from { opacity: 0; } 
        to { opacity: 1; } 
      }
      @keyframes scaleIn {
        from { 
          opacity: 0;
          transform: scale(0.9);
        }
        to { 
          opacity: 1;
          transform: scale(1);
        }
      }
      .gallery-masonry { 
        column-count: 2; 
        column-gap: 12px; 
        width: 100%; 
        max-width: 1400px;
        margin: 0 auto;
      }
      @media (min-width: 768px) { 
        .gallery-masonry { column-count: 3; } 
      }
      @media (min-width: 1200px) { 
        .gallery-masonry { column-count: 4; } 
      }
      @media (min-width: 1400px) { 
        .gallery-masonry { column-count: 5; } 
      }
      
      .gallery-masonry-item {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 12px;
        display: block;
        width: 100%;
        background: #f6f6f6;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.2s ease;
      }
      .gallery-masonry-item:hover { 
        transform: translateY(-2px); 
      }
      .gallery-image { 
        width: 100%; 
        height: auto; 
        display: block; 
        opacity: 0; 
        transition: opacity 0.4s ease; 
        object-fit: cover;
      }
      .gallery-image.loaded { 
        opacity: 1; 
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * 优化后的图片项：
 * 移除多余的 useEffect，直接通过 onLoad 处理比例
 */
const GalleryImage = React.memo(({ article, onImageClick }: { article: any; onImageClick: (article: any) => void }) => {
  const [aspectRatio, setAspectRatio] = useState<string | number>('3 / 4'); // 默认给一个较长比例的占位
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const imageUrl = article?.cover_image_url 
    || article?.cover_image?.url 
    || article?.imageUrl 
    || article?.firstImageUrl;

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      setAspectRatio(`${naturalWidth} / ${naturalHeight}`);
    }
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => setError(true), []);
  const handleClick = useCallback(() => onImageClick(article), [onImageClick, article]);

  return (
    <div className="gallery-masonry-item" onClick={handleClick}>
      <div style={{ position: 'relative', width: '100%', aspectRatio, overflow: 'hidden' }}>
        {!error && imageUrl && (
          <img
            src={imageUrl}
            alt={article.title ?? '作品封面'}
            loading="lazy"
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            className={`gallery-image ${isLoaded ? 'loaded' : ''}`}
          />
        )}
        {(!isLoaded || error) && (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#eee', 
            color: '#bbb', 
            fontSize: '12px' 
          }}>
            {error ? '加载失败' : '...'}
          </div>
        )}
      </div>
    </div>
  );
});

GalleryImage.displayName = 'GalleryImage';

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

  const ITEMS_PER_PAGE = 20;
  
  // 使用 Ref 保持最新状态，避免在 IntersectionObserver 闭包中拿到旧值
  const stateRef = useRef({ offset, loading, loadingMore, hasMore });
  useEffect(() => {
    stateRef.current = { offset, loading, loadingMore, hasMore };
  }, [offset, loading, loadingMore, hasMore]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null); // 用于触发无限滚动的哨兵
  const isMountedRef = useRef(true);

  // 组件挂载状态追踪
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 数据请求逻辑优化
  const fetchDrawingArticles = useCallback(async (currentOffset: number, isAppend = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (!isMountedRef.current) return;
      
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setArticles([]);
        setOffset(0);
        setHasMore(true);
      }

      const res = await apiGet(`/api/articles/drawing?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`, {
        requiresAuth: false,
        signal: controller.signal
      });
      
      if (controller.signal.aborted) return;

      const data = await res.json();

      if (!isMountedRef.current) return;
      if (controller.signal.aborted) return;

      if (data.success) {
        setArticles(prev => {
          if (!isAppend) return data.articles;
          const ids = new Set(prev.map(a => a.id));
          return [...prev, ...data.articles.filter((a: any) => !ids.has(a.id))];
        });
        setOffset(currentOffset + data.articles.length);
        setHasMore(data.articles.length === ITEMS_PER_PAGE);
      } else {
        message.error('获取作品失败');
        setHasMore(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      console.error(err);
      if (isMountedRef.current) {
        message.error('获取作品失败');
        setHasMore(false);
      }
    } finally {
      if (isMountedRef.current && !controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // 1. 初始化与模式切换
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setOffset(0);
    setHasMore(true);
    fetchDrawingArticles(0, false);
  }, [filterMode, fetchDrawingArticles]);

  // 2. 【性能核心】使用 IntersectionObserver 代替 Scroll 监听
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      const { loading, loadingMore, hasMore, offset } = stateRef.current;
      
      if (target.isIntersecting && !loading && !loadingMore && hasMore) {
        fetchDrawingArticles(offset, true);
      }
    }, { rootMargin: '400px' }); // 提前 400px 触发加载

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchDrawingArticles]);

  // 3. 权限过滤逻辑
  const userMaxAccessLevel = useMemo(() => {
    if (!isLoggedIn || !user) return 2;
    return user.max_access_level ?? 2;
  }, [isLoggedIn, user]);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const articleVisibleLevel = article.visible_access_level ?? article.visibleAccessLevel ?? article.max_access_level ?? article.maxAccessLevel ?? 1;
      const articleFullLevel = article.full_access_level ?? article.fullAccessLevel ?? articleVisibleLevel;

      if (filterMode === 'study') {
        return articleFullLevel === 1;
      } else if (filterMode === 'strict') {
        return userMaxAccessLevel >= articleFullLevel;
      } else if (filterMode === 'loose') {
        return userMaxAccessLevel >= articleVisibleLevel;
      }
      return false;
    });
  }, [articles, filterMode, userMaxAccessLevel]);

  const handleImageClick = useCallback(async (article: any) => {
    if (article.blocks?.length) {
      setSelectedArticle(article);
      return;
    }
    try {
      const res = await apiGet(`/api/articles/${article.id}`, { requiresAuth: false });
      const data = await res.json();
      
      if (!isMountedRef.current) return;
      
      if (data.success) {
        const fullArticle = { ...article, blocks: data.article.blocks };
        setArticles(prev => prev.map(a => a.id === article.id ? fullArticle : a));
        setSelectedArticle(fullArticle);
      } else {
        message.error('获取作品详情失败');
      }
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        message.error('获取作品详情失败');
      }
    }
  }, []);

  const handleTitleClick = useCallback((article: any) => router.push(`/article/${article.id}`), [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedArticle(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 设置页面配置
  useEffect(() => {
    setConfig({
      box1Content: null,
      hideBox1: false,
    });

    return () => {
      setConfig({ box1Content: null });
    };
  }, [setConfig]);

  return (
    <>
      {/* 主内容 - 使用 CSS Column 瀑布流 */}
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Spin size="large" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <Empty
            icon="🎨"
            title="还没有作品"
            description="快来发布你的第一件作品吧！"
          />
        ) : (
          <>
            <div className="gallery-masonry">
              {filteredArticles.map((article) => (
                <GalleryImage
                  key={article.id}
                  article={article}
                  onImageClick={handleImageClick}
                />
              ))}
            </div>
            
            {/* 哨兵元素：出现在视口时触发加载更多 */}
            <div ref={sentinelRef} style={{ height: '20px', margin: '20px 0' }}>
              {loadingMore && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 12, fontSize: 14 }}>加载更多作品...</div>
                </div>
              )}
            </div>

            {!hasMore && filteredArticles.length > 0 && (
              <LoadEnd message="没了" />
            )}
          </>
        )}
      </div>

      {/* 模态框 */}
      {selectedArticle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1500,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setSelectedArticle(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'scaleIn 0.3s ease'
            }}
            onClick={e => e.stopPropagation()}
          >
            <DrawingGalleryCard
              article={selectedArticle}
              onTitleClick={() => handleTitleClick(selectedArticle)}
            />
          </div>
        </div>
      )}

      {/* 浮动按钮 */}
      <GalleryPublishFloat
        onSuccess={() => {
          setOffset(0);
          setHasMore(true);
          fetchDrawingArticles(0, false);
        }}
      />
    </>
  );
}
