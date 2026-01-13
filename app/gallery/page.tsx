'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Masonry, Spin, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import PageLayout from '../components/PageLayout';
import { apiGet } from '@/lib/apiClient';

// 重型组件懒加载 - 减少首屏 JS 体积
// 绘画卡片组件懒加载
const DrawingGalleryCard = dynamic(() => import('../components/cards/DrawingGalleryCard'), { 
  ssr: false 
});

// 发布悬浮按钮懒加载
const GalleryPublishFloat = dynamic(() => import('../components/float/GalleryPublishFloat'), { 
  ssr: false 
});

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

// 图片项组件（显示文章的封面）
const GalleryImage: React.FC<{
  article: any;
  onClick: () => void;
}> = ({ article, onClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4/3', // 固定宽高比，避免 CLS
        cursor: 'pointer',
        borderRadius: 6,
        overflow: 'hidden',
        background: '#f6f6f6',
      }}
      onClick={onClick}
    >
      {/* 占位图 - 始终渲染，避免 conditional render */}
      <div style={{ 
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: imgLoaded ? 0 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
      }}>
        <svg
          viewBox="0 0 400 300"
          style={{ width: '100%', height: '100%', display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <rect width="400" height="300" fill="#f0f0f0" />
          <path d="M200 120 L200 180 M170 150 L230 150" stroke="#d0d0d0" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>

      {/* 真实图片 - 始终渲染，使用 opacity 控制显示 */}
      <img
        src={article.cover_image_url}
        alt={article.title ?? '作品封面'}
        width={400}
        height={300}
        onLoad={() => setImgLoaded(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: imgLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease, transform 0.32s ease, filter 0.32s ease',
          transformOrigin: 'center center',
        }}
        onMouseEnter={(e) => { 
          (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'; 
          (e.currentTarget as HTMLImageElement).style.filter = 'brightness(0.98)'; 
        }}
        onMouseLeave={(e) => { 
          (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; 
          (e.currentTarget as HTMLImageElement).style.filter = 'none'; 
        }}
      />
    </div>
  );
};

export default function GalleryPage() {
  const router = useRouter();
  const { currentFishbowlTheme } = useAppTheme();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [columns, setColumns] = useState<number>(() => {
    // SSR guard: 默认 3，客户端会在 useEffect 里修正
    return typeof window !== 'undefined' ? calculateColumns(window.innerWidth) : 3;
  });
  const ITEMS_PER_PAGE = 20;

  // refs 用于在事件回调中读取最新状态，避免闭包带来的 stale 问题
  const offsetRef = useRef(offset);
  const loadingRef = useRef(loading);
  const loadingMoreRef = useRef(loadingMore);
  const hasMoreRef = useRef(hasMore);

  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  // 获取绘画作品（使用 useCallback，避免每次渲染重建）
  const fetchDrawingArticles = useCallback(async (currentOffset: number, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const response = await apiGet(`/api/articles/drawing?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`, { requiresAuth: true });
      const data = await response.json();

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

        // 更新 offset 与是否有更多
        const loaded = data.articles.length;
        const newOffset = currentOffset + loaded;
        setOffset(newOffset);
        setHasMore(loaded === ITEMS_PER_PAGE);
      } else {
        message.error('获取作品失败');
        setHasMore(false);
      }
    } catch (err) {
      console.error('获取作品失败:', err);
      message.error('获取作品失败');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // 初次加载
  useEffect(() => {
    fetchDrawingArticles(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听窗口大小变化（列数）
  useEffect(() => {
    const handleResize = () => setColumns(calculateColumns(window.innerWidth));
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 无限滚动：使用简单的节流
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try {
          if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) {
            ticking = false;
            return;
          }
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollHeight = document.documentElement.scrollHeight;
          const clientHeight = window.innerHeight;

          if (scrollHeight - scrollTop - clientHeight < 300) {
            // 拉取更多
            fetchDrawingArticles(offsetRef.current, true);
          }
        } finally {
          ticking = false;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [fetchDrawingArticles]);

  // 点击图片：如果需要则请求详情
  const handleImageClick = async (article: any) => {
    if (article.blocks && article.blocks.length > 0) {
      setSelectedArticle(article);
      return;
    }

    try {
      const detailRes = await apiGet(`/api/articles/${article.id}`, { requiresAuth: true });
      const detailData = await detailRes.json();

      if (detailData.success) {
        const fullArticle = { ...article, blocks: detailData.article.blocks };
        setArticles(prev => prev.map(a => a.id === article.id ? fullArticle : a));
        setSelectedArticle(fullArticle);
      } else {
        message.error('获取作品详情失败');
      }
    } catch (err) {
      console.error('获取作品详情失败:', err);
      message.error('获取作品详情失败');
    }
  };

  const handleTitleClick = (article: any) => {
    router.push(`/article/${article.id}`);
  };

  // 支持 Esc 关闭 modal（提高体验）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedArticle(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <PageLayout
        theme={currentFishbowlTheme}
        box2Style={{ padding: '40px 6px' }}
      >
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
              items={articles.map((article, index) => ({ key: article.id, data: article, index }))}
              itemRender={({ data }) => (
                <GalleryImage article={data} onClick={() => handleImageClick(data)} />
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
      </PageLayout>

      {/* 图组卡片遮罩层：纯净实现，无 Modal */}
      {selectedArticle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1500,
            background: 'rgba(0, 0, 0, 0.5)', // 半透明黑色遮罩
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setSelectedArticle(null)} // 点击遮罩关闭
        >
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'scaleIn 0.3s ease',
            }}
            onClick={e => e.stopPropagation()} // 阻止点击内容关闭
          >
            <DrawingGalleryCard
              article={selectedArticle}
              onTitleClick={() => handleTitleClick(selectedArticle)}
            />
          </div>
        </div>
      )}

      {/* 发布悬浮按钮 */}
      <GalleryPublishFloat
        onSuccess={() => {
          // 重新加载列表
          setOffset(0);
          setHasMore(true);
          fetchDrawingArticles(0, false);
        }}
      />
    </>
  );
}
