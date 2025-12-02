'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card } from 'antd';
import { formatRelativeTime } from '@/app/utils/timeFormat';

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
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0])); // 记录已加载的图片索引

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

  // 切换到上一张（循环）
  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  // 切换到下一张（循环）
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // 标记当前图片已加载
  const handleImageLoad = () => {
    setLoadedImages(prev => new Set(prev).add(currentIndex));
  };

  // 判断当前图片是否已加载
  const isCurrentImageLoaded = loadedImages.has(currentIndex);

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

  // 处理图片区域点击（左侧上一张，右侧下一张）
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const halfWidth = rect.width / 2;

    if (clickX < halfWidth) {
      handlePrevious(e);
    } else {
      handleNext(e);
    }
  };

  if (!currentImage) return null;

  return (
    <Card
      hoverable
      style={{ 
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      styles={{ body: { padding: 0 } }}
      onClick={onClick}
    >
      {/* 图片区域 - 点击左右切换 */}
      <div 
        style={{ position: 'relative', minHeight: '300px' }}
        onClick={handleImageClick}
      >
        {!isCurrentImageLoaded && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}>
            加载中...
          </div>
        )}
        <img
          key={currentImage.id} // 添加 key 确保每张图片独立渲染
          src={currentImage.url}
          alt="图片"
          onLoad={handleImageLoad}
          style={{
            width: '100%',
            display: 'block',
            opacity: isCurrentImageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
        
        {/* 图片指示点 */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '20px',
          }}>
            {images.map((_, index) => (
              <div
                key={index}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: index === currentIndex ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                  transition: 'background 0.3s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 信息区域 - 点击进入文章 */}
      <div 
        style={{ padding: '16px' }}
        onClick={(e) => {
          e.stopPropagation();
          onTitleClick?.();
        }}
      >
        <h4 style={{ 
          margin: '0 0 8px 0',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          {article.title}
        </h4>
        {article.excerpt && (
          <p style={{
            margin: 0,
            color: '#666',
            fontSize: '14px',
            lineHeight: '1.5',
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
          marginTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#999',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>👤 {article.author}</span>
            <span>🎨 {images.length} 张</span>
          </div>
          <span>
            📝 {formatRelativeTime(article.last_modified)}
          </span>
        </div>
      </div>
    </Card>
  );
}

