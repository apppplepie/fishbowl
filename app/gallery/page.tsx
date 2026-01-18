'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Masonry, message } from 'antd';
import { Spin, Empty, LoadEnd } from '@/app/components/ui';
import { useRouter } from 'next/navigation';
import { usePageShell } from '@/app/contexts/PageShellContext';
import DrawingGalleryCard from '../components/cards/DrawingGalleryCard';
import GalleryPublishFloat from '../components/float/GalleryPublishFloat';
import { apiGet } from '@/lib/apiClient';

// 注入动画样式和图片 hover 效果
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
      .gallery-image {
        transition: transform 0.32s ease, filter 0.32s ease;
        transform-origin: center center;
      }
      .gallery-image:hover {
        transform: scale(1.04);
        filter: brightness(0.98);
        will-change: transform;
      }
      .gallery-image:active {
        will-change: auto;
      }
    `;
    document.head.appendChild(style);
  }
}

// 根据屏幕宽度计算列数
const calculateColumns = (width: number) => {
  if (width >= 1400) return 5;
  if (width >= 1200) return 4;
  if (width >= 768) return 3;
  if (width >= 480) return 2;
  return 2;
};

// 图片项组件 - 使用 React.memo 优化渲染
const GalleryImage: React.FC<{ article: any; onImageClick: (article: any) => void }> = React.memo(({ article, onImageClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const coverImage = article?.cover_image || article?.coverImage || null;
  const imageUrl = article?.cover_image_url
    || coverImage?.url
    || article?.imageUrl
    || article?.firstImageUrl
    || null;
  const initialAspectRatio = (coverImage?.width && coverImage?.height)
    ? `${coverImage.width} / ${coverImage.height}`
    : (article?.imageWidth && article?.imageHeight)
      ? `${article.imageWidth} / ${article.imageHeight}`
      : '3 / 2';
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio);

  // 使用 useCallback 避免每次渲染创建新函数
  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
    }
    setImgLoaded(true);
  }, []);
  const handleError = useCallback(() => setImgError(true), []);
  const handleClick = useCallback(() => onImageClick(article), [onImageClick, article]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleClick();
  }, [handleClick]);

  useEffect(() => {
    setAspectRatio(initialAspectRatio);
  }, [initialAspectRatio]);

  useEffect(() => {
    if (!imageUrl) setImgError(true);
  }, [imageUrl]);

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        position: 'relative',
        width: '100%',
        cursor: 'pointer',
        borderRadius: 6,
        overflow: 'hidden',
        background: '#f6f6f6',
      }}
      onClick={handleClick}
    >
      {!imgLoaded && !imgError && (
        <div style={{ width: '100%', aspectRatio, position: 'relative' }}>
          <svg
            viewBox="0 0 400 300"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <rect width="400" height="300" fill="#f0f0f0" />
            <path d="M200 120 L200 180 M170 150 L230 150" stroke="#d0d0d0" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {!imgError && imageUrl && (
        <img
          src={imageUrl}
          alt={article.title ?? '作品封面'}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
          className="gallery-image"
        />
      )}
      
      {imgError && (
        <div style={{ width: '100%', aspectRatio, position: 'relative', background: '#f0f0f0' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            加载失败
          </div>
        </div>
      )}
    </div>
  );
});

GalleryImage.displayName = 'GalleryImage';

export default function GalleryPage() {
  const router = useRouter();
  const { setConfig } = usePageShell();

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [columns, setColumns] = useState<number>(() => typeof window !== 'undefined' ? calculateColumns(window.innerWidth) : 3);

  const ITEMS_PER_PAGE = 20;

  // refs 防闭包 stale 和内存泄漏
  const offsetRef = useRef(offset);
  const loadingRef = useRef(loading);
  const loadingMoreRef = useRef(loadingMore);
  const hasMoreRef = useRef(hasMore);
  const isMountedRef = useRef(true); // 用于防止组件卸载后更新状态
  
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  
  // 组件挂载状态追踪
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 获取数据
  const fetchDrawingArticles = useCallback(async (currentOffset: number, append = false) => {
    try {
      if (!isMountedRef.current) return;
      
      if (append) setLoadingMore(true);
      else setLoading(true);

      const res = await apiGet(`/api/articles/drawing?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`, { requiresAuth: false });
      const data = await res.json();

      if (!isMountedRef.current) return; // 检查组件是否已卸载

      if (data.success) {
        if (append) {
          setArticles(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const newArticles = data.articles.filter((a: any) => !existingIds.has(a.id));
            return [...prev, ...newArticles];
          });
        } else {
          setArticles(data.articles);
        }

        const loaded = data.articles.length;
        setOffset(currentOffset + loaded);
        setHasMore(loaded === ITEMS_PER_PAGE);
      } else {
        message.error('获取作品失败');
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        message.error('获取作品失败');
        setHasMore(false);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // 初次加载
  useEffect(() => { fetchDrawingArticles(0); }, [fetchDrawingArticles]);

  // 响应列数
  useEffect(() => {
    const handleResize = () => setColumns(calculateColumns(window.innerWidth));
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 无限滚动
  useEffect(() => {
    let ticking = false;
    let rafId: number | null = null;
    
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(() => {
        try {
          if (!isMountedRef.current) return; // 组件已卸载，不执行
          if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return;
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollHeight = document.documentElement.scrollHeight;
          const clientHeight = window.innerHeight;
          if (scrollHeight - scrollTop - clientHeight < 300) fetchDrawingArticles(offsetRef.current, true);
        } finally { 
          ticking = false;
          rafId = null;
        }
      });
    };
    
    window.addEventListener('scroll', onScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      // 清理未完成的 RAF
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [fetchDrawingArticles]);

  const handleImageClick = useCallback(async (article: any) => {
    if (article.blocks?.length) { setSelectedArticle(article); return; }
    try {
      const res = await apiGet(`/api/articles/${article.id}`, { requiresAuth: false });
      const data = await res.json();
      
      if (!isMountedRef.current) return; // 检查组件是否已卸载
      
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedArticle(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 设置页面配置（主题由 PageShell 自动从全局读取）
  useEffect(() => {
    setConfig({
      box1Content: null,
      hideBox1: false,
      // 移除 box2Style，使用默认 padding: '40px 20px 20px'，与 archive 和 bookcase 统一
    });

    return () => {
      setConfig({ box1Content: null });
    };
  }, [setConfig]);

  return (
    <>
      {/* 主内容 - 直接渲染在 Box2 里，无闭包问题 */}
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Spin size="large" />
          </div>
        ) : articles.length === 0 ? (
          <Empty
            icon="🎨"
            title="还没有作品"
            description="快来发布你的第一件作品吧！"
          />
        ) : (
          <>
            <Masonry
              columns={columns}
              gutter={8}
              items={articles.map(article => ({ key: article.id, data: article }))}
              itemRender={({ data }) => (
                <GalleryImage
                  article={data}
                  onImageClick={handleImageClick}
                />
              )}
            />
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <Spin size="large" />
                <div style={{ marginTop: 12, fontSize: 14 }}>加载更多作品...</div>
              </div>
            )}
            {!hasMore && articles.length > 0 && (
              <LoadEnd message="没了" />
            )}
          </>
        )}
      </div>

      {/* 模态框 - 固定定位，不受 Box2 影响 */}
      {selectedArticle && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1500,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px', animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setSelectedArticle(null)}
        >
          <div
            style={{
              width: '100%', maxWidth: '900px', maxHeight: '90vh',
              overflow: 'auto', borderRadius: '12px',
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
        onSuccess={() => { setOffset(0); setHasMore(true); fetchDrawingArticles(0); }}
      />
    </>
  );
}
