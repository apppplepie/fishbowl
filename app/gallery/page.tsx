'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Masonry, message } from 'antd';
import { Spin, Empty, LoadEnd } from '@/app/components/ui';
import { useRouter } from 'next/navigation';
import { usePageShell } from '@/app/contexts/PageShellContext';
import DrawingGalleryCard from '../components/cards/DrawingGalleryCard';
import GalleryPublishFloat from '../components/float/GalleryPublishFloat';
import { apiGet } from '@/lib/apiClient';
import { useAccessFilter } from '@/app/hooks/useAccessFilter';
import { useAuth } from '@/app/hooks/useAuth';

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

// 图片项组件 - 使用 React.memo 优化渲染，使用 Next.js Image 组件 + IntersectionObserver 实现真正的懒加载
const GalleryImage: React.FC<{ article: any; onImageClick: (article: any) => void; priority?: boolean }> = React.memo(({ article, onImageClick, priority = false }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(priority); // 是否应该加载图片
  const containerRef = useRef<HTMLDivElement>(null);
  
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

  // 使用 IntersectionObserver 实现真正的懒加载（只在视口内或接近视口时加载）
  useEffect(() => {
    // priority 图片立即加载
    if (priority) {
      setShouldLoad(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // 创建 IntersectionObserver，提前 200px 开始加载
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect(); // 加载后断开观察
          }
        });
      },
      {
        rootMargin: '200px', // 提前 200px 开始加载
        threshold: 0.01,
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  // 使用 useCallback 避免每次渲染创建新函数
  const handleLoadingComplete = useCallback((img: HTMLImageElement | null) => {
    if (img?.naturalWidth && img?.naturalHeight) {
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

  // 模糊占位符（与 ImageCard 保持一致）
  const blurDataURL = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI2NyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI2NyIgZmlsbD0iI2YwZjBmMCIvPjwvc3ZnPg==";

  return (
    <div
      ref={containerRef}
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
      {!imgError && imageUrl && shouldLoad && (
        <div style={{ 
          width: '100%', 
          aspectRatio, 
          position: 'relative',
          overflow: 'hidden',
        }}>
          <Image
            src={imageUrl}
            alt={article.title ?? '作品封面'}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1440px) 25vw, 20vw"
            style={{
              objectFit: 'cover',
              transition: 'opacity 0.2s ease, transform 0.32s ease',
              opacity: imgLoaded ? 1 : 0,
            }}
            className="gallery-image"
            onLoadingComplete={handleLoadingComplete}
            onError={handleError}
            loading="lazy" // 始终使用 lazy，由 shouldLoad 控制是否真正加载
            priority={priority}
            placeholder="blur"
            blurDataURL={blurDataURL}
          />
        </div>
      )}
      
      {!shouldLoad && !imgError && (
        // 占位符：在图片进入视口前显示
        <div style={{ width: '100%', aspectRatio, position: 'relative', background: '#f0f0f0' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px' }}>
            等待加载...
          </div>
        </div>
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
  const { filterMode } = useAccessFilter();
  const { user, isLoggedIn } = useAuth();

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
  const abortControllerRef = useRef<AbortController | null>(null); // 用于取消请求
  
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  
  // 组件挂载状态追踪
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 组件卸载时取消所有进行中的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 获取数据 - 添加请求取消支持
  const fetchDrawingArticles = useCallback(async (currentOffset: number, append = false) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (!isMountedRef.current) return;
      
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        // 重置状态，清空之前的文章列表
        setArticles([]);
        setOffset(0);
        setHasMore(true);
      }

      const res = await apiGet(`/api/articles/drawing?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`, { 
        requiresAuth: false,
        signal: controller.signal // 传递 signal 以支持取消
      });
      
      // 检查请求是否被取消
      if (controller.signal.aborted) return;

      const data = await res.json();

      if (!isMountedRef.current) return; // 检查组件是否已卸载

      // 再次检查是否被取消（在异步操作后）
      if (controller.signal.aborted) return;

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
    } catch (err: any) {
      // 忽略取消请求的错误
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

  // 初次加载和 filterMode 变化时重新加载
  useEffect(() => { 
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // 重置状态并重新加载
    setOffset(0);
    setHasMore(true);
    fetchDrawingArticles(0, false); 
  }, [fetchDrawingArticles, filterMode]); // 当 filterMode 变化时也重新加载

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

  // 获取用户权限等级（未登录用户默认为2）
  const userMaxAccessLevel = useMemo(() => {
    if (!isLoggedIn || !user) return 2; // 未登录用户默认2级
    return user.max_access_level ?? 2;
  }, [isLoggedIn, user]);

  // 过滤文章：根据过滤模式进行过滤
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      // 获取文章的权限字段（兼容新旧字段名）
      const articleVisibleLevel = article.visible_access_level ?? article.visibleAccessLevel ?? article.max_access_level ?? article.maxAccessLevel ?? 1;
      const articleFullLevel = article.full_access_level ?? article.fullAccessLevel ?? articleVisibleLevel;

      // 根据过滤模式进行过滤
      if (filterMode === 'study') {
        // 学习模式：只显示完全公开的文章
        return articleFullLevel === 1;
      } else if (filterMode === 'strict') {
        // 严格模式：用户权限 >= 文章完整阅读权限
        return userMaxAccessLevel >= articleFullLevel;
      } else if (filterMode === 'loose') {
        // 宽松模式：用户权限 >= 文章可见权限
        return userMaxAccessLevel >= articleVisibleLevel;
      }
      return false;
    });
  }, [articles, filterMode, userMaxAccessLevel]);

  return (
    <>
      {/* 主内容 - 直接渲染在 Box2 里，无闭包问题 */}
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
            <Masonry
              columns={columns}
              gutter={8}
              items={filteredArticles.map((article, index) => ({ 
                key: article.id, 
                data: article,
                index // 将 index 存储在 item 中
              }))}
              itemRender={(itemInfo: any) => {
                const { data, index } = itemInfo;
                return (
                  <GalleryImage
                    article={data}
                    onImageClick={handleImageClick}
                    priority={index !== undefined && index < columns * 2} // 首屏前两行图片使用 priority
                  />
                );
              }}
            />
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <Spin size="large" />
                <div style={{ marginTop: 12, fontSize: 14 }}>加载更多作品...</div>
              </div>
            )}
            {!hasMore && filteredArticles.length > 0 && (
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
