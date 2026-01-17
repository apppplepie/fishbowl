'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { usePageShell } from '@/app/contexts/PageShellContext';
import DrawingGalleryCard from '../components/cards/DrawingGalleryCard';
import GalleryPublishFloat from '../components/float/GalleryPublishFloat';
import HorizontalMasonryGrid from '@/app/components/layout/HorizontalMasonryGrid';
import { apiGet } from '@/lib/apiClient';

const PAGE_SIZE = 15; // 每页15条

// 图片项组件 - 用于横向瀑布流
const GalleryImageCard: React.FC<{ article: any }> = React.memo(({ article }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 6,
        overflow: 'hidden',
        background: '#f6f6f6',
        cursor: 'pointer',
      }}
    >
      {!imgLoaded && !imgError && (
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

      {!imgError && (
        <img
          src={article.cover_image_url}
          alt={article.title ?? '作品封面'}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          loading="lazy"
          decoding="async"
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'cover',
            display: imgLoaded ? 'block' : 'none',
          }}
          className="gallery-image"
        />
      )}
      
      {imgError && (
        <div style={{ width: '100%', paddingTop: '75%', position: 'relative', background: '#f0f0f0' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            加载失败
          </div>
        </div>
      )}
    </div>
  );
});

GalleryImageCard.displayName = 'GalleryImageCard';

export default function GalleryHorizontalPage() {
  const router = useRouter();
  const { setConfig } = usePageShell();
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  // 获取一页数据的函数
  const fetchPage = useCallback(async (page: number) => {
    try {
      const res = await apiGet(
        `/api/articles/drawing?page=${page}&limit=${PAGE_SIZE}`,
        { requiresAuth: true }
      );
      const data = await res.json();

      if (data.success) {
        return {
          items: data.articles,
          hasMore: data.articles.length === PAGE_SIZE,
        };
      } else {
        message.error('获取作品失败');
        return { items: [], hasMore: false };
      }
    } catch (err) {
      console.error(err);
      message.error('获取作品失败');
      return { items: [], hasMore: false };
    }
  }, []);

  // 处理卡片点击
  const handleCardClick = useCallback(async (article: any) => {
    if (article.blocks?.length) {
      setSelectedArticle(article);
      return;
    }
    try {
      const res = await apiGet(`/api/articles/${article.id}`, { requiresAuth: true });
      const data = await res.json();
      
      if (data.success) {
        const fullArticle = { ...article, blocks: data.article.blocks };
        setSelectedArticle(fullArticle);
      } else {
        message.error('获取作品详情失败');
      }
    } catch (err) {
      console.error(err);
      message.error('获取作品详情失败');
    }
  }, []);

  const handleTitleClick = useCallback((article: any) => {
    router.push(`/article/${article.id}`);
  }, [router]);

  // ESC 键关闭模态框
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
      // box2 保持默认样式
    });

    return () => {
      setConfig({ box1Content: null });
    };
  }, [setConfig]);

  // 渲染卡片
  const renderCard = useCallback((article: any, onClick?: () => void) => {
    return (
      <div onClick={onClick}>
        <GalleryImageCard article={article} />
      </div>
    );
  }, []);

  return (
    <>
      {/* 横向瀑布流 - 高度直接在 CSS 中设置为 calc(100vh - 45px) */}
      <HorizontalMasonryGrid
        fetchPage={fetchPage}
        renderCard={renderCard}
        onCardClick={handleCardClick}
      />

      {/* 模态框 - 显示作品详情 */}
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
            animation: 'fadeIn 0.2s ease',
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
              animation: 'scaleIn 0.3s ease',
            }}
            onClick={(e) => e.stopPropagation()}
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
          // 刷新时清除缓存，重新加载
          try {
            sessionStorage.removeItem('horizontalMasonryPagesCache');
            sessionStorage.removeItem('horizontalMasonryPageIndex');
          } catch (e) {
            // 忽略错误
          }
          window.location.reload();
        }}
      />
    </>
  );
}

