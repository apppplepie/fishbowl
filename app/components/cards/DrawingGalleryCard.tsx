'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card } from 'antd';
import { formatRelativeTime } from '@/app/utils/timeFormat';

// 注入 CSS 动画
if (typeof document !== 'undefined') {
  const styleId = 'drawing-gallery-card-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

interface DrawingGalleryCardProps {
  article: {
    id: string;
    title: string;
    excerpt?: string;
    author: string;
    last_modified: string;
    blocks: Array<{
      id: string;
      type: string;
      order: number;
      parsedContent: any;
    }>;
  };
  onClick?: () => void;
  onTitleClick?: () => void;
}

/**
 * 绘画图组卡片
 * 从文章的图片块中提取图片，按 order 降序显示（成图在前）
 */
export default function DrawingGalleryCard({ article, onClick, onTitleClick }: DrawingGalleryCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set()); // 记录已加载的图片索引
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set()); // 记录加载失败的图片索引
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 从文章块中提取所有图片块，按 order 降序排列（成图在前）
  const images = useMemo(() => {
    return article.blocks
      .filter((block) => block.type === 'image')
      .sort((a, b) => b.order - a.order) // 降序，order 最大的在最前
      .map((block) => ({
        id: block.id,
        url: block.parsedContent.url,
        description: block.parsedContent.description,
        order: block.order,
      }));
  }, [article.blocks]);

  const currentImage = images[currentIndex];

  // 最小滑动距离（像素）
  const minSwipeDistance = 50;

  // 切换到下一张（循环）
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // 切换到上一张（循环）
  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  // 标记当前图片已加载
  const handleImageLoad = () => {
    setLoadedImages(prev => new Set(prev).add(currentIndex));
    console.log('图片加载成功，索引:', currentIndex, 'URL:', currentImage?.url);
  };

  // 标记当前图片加载失败
  const handleImageError = () => {
    setFailedImages(prev => new Set(prev).add(currentIndex));
    console.error('图片加载失败，索引:', currentIndex, 'URL:', currentImage?.url);
  };

  // 判断当前图片是否已加载
  const isCurrentImageLoaded = loadedImages.has(currentIndex);
  const isCurrentImageFailed = failedImages.has(currentIndex);

  // 预加载相邻图片
  useEffect(() => {
    if (images.length <= 1) return;

    const preloadImage = (index: number) => {
      if (loadedImages.has(index)) return;
      
      const img = new Image();
      img.src = images[index].url;
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(index));
      };
    };

    // 预加载下一张
    const nextIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    preloadImage(nextIndex);

    // 预加载上一张
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    preloadImage(prevIndex);
  }, [currentIndex, images, loadedImages]);

  // 处理图片区域点击（左侧1/3下一张，右侧1/3上一张）
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const leftThird = rect.width / 3;
    const rightThird = rect.width * 2 / 3;

    if (clickX < leftThird) {
      handleNext(e);
    } else if (clickX > rightThird) {
      handlePrevious(e);
    }
    // 中间1/3不触发切换
  };

  // 触摸开始
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  // 触摸移动
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // 触摸结束
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // 左滑：显示上一张
      handlePrevious({ stopPropagation: () => {} } as React.MouseEvent);
    } else if (isRightSwipe) {
      // 右滑：显示下一张
      handleNext({ stopPropagation: () => {} } as React.MouseEvent);
    }
  };

  if (!currentImage) return null;

  return (
    <Card
      hoverable
      style={{ 
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
        border: 'none',
      }}
      styles={{ body: { padding: 0 } }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* 图片区域 - 点击左右切换 + 触摸滑动 */}
      <div 
        style={{ 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: '200px',
        }}
        onClick={handleImageClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {!isCurrentImageLoaded && !isCurrentImageFailed && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}>
            <div style={{
              color: 'white',
              fontSize: '16px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div className="loading-spinner" style={{
                width: '20px',
                height: '20px',
                border: '3px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              加载中...
            </div>
          </div>
        )}
        {isCurrentImageFailed && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            color: 'white',
            padding: '20px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>😢</div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>图片加载失败</div>
            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8, textAlign: 'center', wordBreak: 'break-all' }}>
              {currentImage.url}
            </div>
          </div>
        )}
        <img
          key={currentImage.id}
          src={currentImage.url}
          alt="图片"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            maxWidth: '100%',
            maxHeight: 'calc(100vh - 111px - 200px)', // 减去PageLayout黑框+header(111px) 和卡片信息区域(约200px)
            width: 'auto',
            height: 'auto',
            display: 'block',
            objectFit: 'contain',
            opacity: isCurrentImageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
        
        {/* 图片指示点 - 极简风格 */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
          }}>
            {images.map((_, index) => (
              <div
                key={index}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: index === currentIndex 
                    ? '#ffffff'
                    : 'rgba(255, 255, 255, 0.4)',
                  transition: 'background 0.2s ease',
                  cursor: 'pointer',
                  boxShadow: index === currentIndex 
                    ? '0 2px 4px rgba(0,0,0,0.2)' 
                    : 'none',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 信息区域 - 点击进入文章 */}
      <div 
        style={{ 
          padding: '20px',
          background: 'linear-gradient(to bottom, #ffffff 0%, #fafafa 100%)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onTitleClick?.();
        }}
      >
        <h4 style={{ 
          margin: '0 0 10px 0',
          fontSize: '18px',
          fontWeight: 600,
          cursor: 'pointer',
          color: '#1a1a1a',
          lineHeight: '1.4',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#667eea'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#1a1a1a'}
        >
          {article.title}
        </h4>
        {article.excerpt && (
          <p style={{
            margin: '0 0 14px 0',
            color: '#666',
            fontSize: '14px',
            lineHeight: '1.6',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            cursor: 'pointer',
          }}>
            {article.excerpt}
          </p>
        )}
        
        {/* 底部信息 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          color: '#999',
          paddingTop: '12px',
          borderTop: '1px solid #f0f0f0',
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
              borderRadius: '6px',
              color: '#667eea',
              fontWeight: 500,
            }}>
              <span style={{ fontSize: '16px' }}>👤</span>
              {article.author}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: 'linear-gradient(135deg, #f093fb15 0%, #f5576c15 100%)',
              borderRadius: '6px',
              color: '#f5576c',
              fontWeight: 500,
            }}>
              <span style={{ fontSize: '16px' }}>🎨</span>
              {images.length} 张
            </div>
          </div>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#999',
          }}>
            <span style={{ fontSize: '14px' }}>📝</span>
            {formatRelativeTime(article.last_modified)}
          </span>
        </div>
      </div>
    </Card>
  );
}

