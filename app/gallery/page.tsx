'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Masonry, Spin, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import { usePageShell } from '@/app/contexts/PageShellContext';
import DrawingGalleryCard from '../components/cards/DrawingGalleryCard';
import GalleryPublishFloat from '../components/float/GalleryPublishFloat';
import { apiGet } from '@/lib/apiClient';

// 注入动画样式
if (typeof document !== 'undefined') {
  const styleId = 'gallery-modal-animations';
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

// 图片项组件
const GalleryImage: React.FC<{ article: any; onClick: () => void }> = ({ article, onClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      style={{
        position: 'relative',
        width: '100%',
        cursor: 'pointer',
        borderRadius: 6,
        overflow: 'hidden',
        background: '#f6f6f6',
      }}
      onClick={onClick}
    >
      {!imgLoaded && (
        <div style={{ width: '100%', paddingTop: '75%', position: 'relative' }}>
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

      <img
        src={article.cover_image_url}
        alt={article.title ?? '作品封面'}
        onLoad={() => setImgLoaded(true)}
        style={{
          width: '100%',
          maxHeight: 500,
          objectFit: 'cover',
          display: imgLoaded ? 'block' : 'none',
          transition: 'transform 0.32s ease, filter 0.32s ease',
          transformOrigin: 'center center',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'; (e.currentTarget as HTMLImageElement).style.filter = 'brightness(0.98)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLImageElement).style.filter = 'none'; }}
      />
    </div>
  );
};

export default function GalleryPage() {
  console.log('[GalleryPage] 组件渲染开始 - 时间戳:', Date.now());

  const router = useRouter();
  const { currentFishbowlTheme, mounted } = useAppTheme();
  const { setConfig } = usePageShell();

  console.log('[GalleryPage] hooks 初始化完成:', {
    hasCurrentFishbowlTheme: !!currentFishbowlTheme,
    mounted,
    currentFishbowlTheme: currentFishbowlTheme ? {
      id: currentFishbowlTheme.id,
      name: currentFishbowlTheme.name,
      hasSkyGradient: !!currentFishbowlTheme.skyGradient,
      hasWaterGradient: !!currentFishbowlTheme.waterGradient
    } : null
  });

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [columns, setColumns] = useState<number>(() => typeof window !== 'undefined' ? calculateColumns(window.innerWidth) : 3);

  console.log('[GalleryPage] 组件状态更新:', {
    hasCurrentFishbowlTheme: !!currentFishbowlTheme,
    currentFishbowlTheme: currentFishbowlTheme ? {
      id: currentFishbowlTheme.id,
      name: currentFishbowlTheme.name,
      hasSkyGradient: !!currentFishbowlTheme.skyGradient,
      hasWaterGradient: !!currentFishbowlTheme.waterGradient
    } : null,
    mounted,
    articlesCount: articles.length,
    loading,
    loadingMore,
    hasMore
  });

  const ITEMS_PER_PAGE = 20;

  // 监听 mounted 状态变化
  useEffect(() => {
    console.log('[GalleryPage] mounted 状态变化:', mounted);
  }, [mounted]);

  // refs 防闭包 stale
  const offsetRef = useRef(offset);
  const loadingRef = useRef(loading);
  const loadingMoreRef = useRef(loadingMore);
  const hasMoreRef = useRef(hasMore);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  // 获取数据
  const fetchDrawingArticles = useCallback(async (currentOffset: number, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const res = await apiGet(`/api/articles/drawing?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`, { requiresAuth: true });
      const data = await res.json();

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
      message.error('获取作品失败');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try {
          if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return;
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollHeight = document.documentElement.scrollHeight;
          const clientHeight = window.innerHeight;
          if (scrollHeight - scrollTop - clientHeight < 300) fetchDrawingArticles(offsetRef.current, true);
        } finally { ticking = false; }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [fetchDrawingArticles]);

  const handleImageClick = async (article: any) => {
    if (article.blocks?.length) { setSelectedArticle(article); return; }
    try {
      const res = await apiGet(`/api/articles/${article.id}`, { requiresAuth: true });
      const data = await res.json();
      if (data.success) {
        const fullArticle = { ...article, blocks: data.article.blocks };
        setArticles(prev => prev.map(a => a.id === article.id ? fullArticle : a));
        setSelectedArticle(fullArticle);
      } else message.error('获取作品详情失败');
    } catch (err) { console.error(err); message.error('获取作品详情失败'); }
  };

  const handleTitleClick = (article: any) => router.push(`/article/${article.id}`);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedArticle(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 只设置主题配置，内容直接渲染（无闭包问题）
  useEffect(() => {
    if (currentFishbowlTheme) {
      console.log('[GalleryPage] 设置 PageShell 主题配置:', {
        themeId: currentFishbowlTheme.id,
        themeName: currentFishbowlTheme.name,
      });

      setConfig({
        theme: currentFishbowlTheme,
        box1Content: null,
        hideBox1: false,
        box2Style: { padding: '40px 6px' },
      });
    }

    return () => {
      console.log('[GalleryPage] 清理配置');
      setConfig({ box1Content: null, theme: undefined });
    };
  }, [setConfig, currentFishbowlTheme]);

  console.log('[GalleryPage] 即将渲染 JSX');

  return (
    <>
      {/* 主内容 - 直接渲染在 Box2 里，无闭包问题 */}
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Spin size="large" />
          </div>
        ) : articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: '#999' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>还没有作品</p>
          </div>
        ) : (
          <>
            <Masonry
              columns={columns}
              gutter={8}
              items={articles.map(a => ({ key: a.id, data: a }))}
              itemRender={({ data }) => (
                <GalleryImage 
                  article={data} 
                  onClick={() => handleImageClick(data)} 
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
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999', fontSize: 14 }}>
                没了
              </div>
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
