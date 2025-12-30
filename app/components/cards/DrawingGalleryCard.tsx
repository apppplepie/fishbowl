'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { PlaceholderBlock as PlaceholderBlockType } from '@/app/types/block';
import PlaceholderDisplay from '@/app/components/blocks/PlaceholderDisplay';
import { useResponsive } from '@/app/hooks/useResponsive';

interface DrawingGalleryCardProps {
  article: any;
  onClick?: () => void; // 点击整个卡片
  onTitleClick?: () => void; // 点击标题
  style?: React.CSSProperties;
}

// 极简风格的绘画图组卡片：
// - 最大尺寸限制：max-width: 90vw, max-height: 90vh
// - 图片等比放大（object-fit: contain）并居中显示
// - 标题悬浮在图片上（左下），半透明背景，提高可读性
// - 支持左右点击切换与触摸滑动

export default function DrawingGalleryCard({ article, onClick, onTitleClick, style }: DrawingGalleryCardProps) {
  const { isMobile } = useResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const touchStartRef = useRef<number | null>(null);
  const hasSwipedRef = useRef(false);

  const images = useMemo(() => {
    return (article?.blocks || [])
      .filter((block: any) => {
        if (block.type === 'image') return true;
        if (block.type === 'placeholder') {
          const pb = block as PlaceholderBlockType;
          return pb.original_type === 'image';
        }
        return false;
      })
      .sort((a: any, b: any) => a.order - b.order)
      .map((block: any) => ({
        id: block.id,
        type: block.type,
        url: block.type === 'image' ? block.parsedContent?.url ?? null : null,
        placeholderData: block.type === 'placeholder' ? (block as PlaceholderBlockType) : null,
        order: block.order,
      }));
  }, [article]);

  useEffect(() => {
    if (images.length > 0 && currentIndex >= images.length) setCurrentIndex(0);
  }, [images.length, currentIndex]);

  const currentImage = images[currentIndex];

  // 预加载相邻图
  useEffect(() => {
    if (!images || images.length <= 1) return;
    const preload = (idx: number) => {
      if (idx < 0 || idx >= images.length) return;
      if (loadedImages.has(idx) || failedImages.has(idx)) return;
      const it = images[idx];
      if (it?.type === 'image' && it.url) {
        const img = new Image();
        img.src = it.url;
        img.onload = () => setLoadedImages(prev => new Set(prev).add(idx));
        img.onerror = () => setFailedImages(prev => new Set(prev).add(idx));
      }
    };
    preload((currentIndex + 1) % images.length);
    preload((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images, loadedImages, failedImages]);

  const minSwipeDistance = 50;

  const handleTapOrClick = (e: React.MouseEvent) => {
    if (hasSwipedRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const leftThird = rect.width / 3;
    const rightThird = rect.width * 2 / 3;
    if (x < leftThird) setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    else if (x > rightThird) setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    // 中间区域不触发翻页，供外部 onClick 使用
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    hasSwipedRef.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current == null) return;
    const dx = e.touches[0].clientX - touchStartRef.current;
    if (Math.abs(dx) > 10) hasSwipedRef.current = true;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current == null) return;
    const endX = e.changedTouches[0].clientX;
    const distance = touchStartRef.current - endX;
    if (distance > minSwipeDistance) {
      // left swipe (show prev)
      setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    } else if (distance < -minSwipeDistance) {
      // right swipe (show next)
      setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    }
    touchStartRef.current = null;
    setTimeout(() => { hasSwipedRef.current = false; }, 250);
  };

  const markLoaded = () => setLoadedImages(prev => new Set(prev).add(currentIndex));
  const markFailed = () => setFailedImages(prev => new Set(prev).add(currentIndex));

  if (!currentImage) {
    return (
      <div style={{
        width: '100%',
        maxWidth: '90vw',
        maxHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#f6f6f6',
        ...style,
      }} onClick={onClick}>
        <div style={{ color: '#888' }}>没有可显示的图片</div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      style={{
        width: '100%',
        maxWidth: '90vw',
        maxHeight: '90vh',
        height: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'transparent',
        touchAction: 'pan-y', // 允许垂直滚动，但减少横向触摸冲突
        ...style,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 图片承载区，居中并等比最大化 */}
      <div
        onClick={handleTapOrClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* 加载/错误覆盖层 */}
        {!loadedImages.has(currentIndex) && !failedImages.has(currentIndex) && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2, pointerEvents: 'none'
          }}>
            <div style={{
              padding: '6px 10px', borderRadius: 9999, background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 13
            }}>加载中…</div>
          </div>
        )}

        {failedImages.has(currentIndex) ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <div style={{ color: '#fff', background: 'linear-gradient(90deg,#ff7a7a,#ff5a9b)', padding: 12, borderRadius: 8 }}>
              图片加载失败
            </div>
          </div>
        ) : null}

        {/* 图片 或 占位块 */}
        {currentImage.type === 'placeholder' && currentImage.placeholderData ? (
          <div style={{ width: '100%', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlaceholderDisplay block={currentImage.placeholderData} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          </div>
        ) : currentImage.url ? (
          <img
            src={currentImage.url}
            alt={article.title || 'image'}
            onLoad={markLoaded}
            onError={markFailed}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
              userSelect: 'none',
              MozUserSelect: 'none',
              ...(typeof document !== 'undefined' && { WebkitUserDrag: 'none' }),
              transition: 'transform 0.28s ease, opacity 0.28s ease',
              opacity: loadedImages.has(currentIndex) ? 1 : 0.001,
            } as React.CSSProperties}
            draggable={false}
          />
        ) : (
          <div style={{ color: '#888' }}>图片不可用</div>
        )}

        {/* 标题浮层（左下） */}
        <div
          onClick={(e) => { e.stopPropagation(); onTitleClick?.(); }}
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            zIndex: 3,
            maxWidth: 'calc(100% - 24px)',
            padding: '8px 12px',
            borderRadius: 10,
            background: 'rgba(0,0,0,0.45)',
            color: '#fff',
            fontWeight: 600,
            fontSize: isMobile ? 14 : 16,
            lineHeight: 1.2,
            backdropFilter: 'blur(6px)',
            cursor: 'pointer',
          }}
        >
          {article.title}
        </div>

        {/* 极简指示点（可选） */}
        {images.length > 1 && (
          <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 3, display: 'flex', gap: 8 }}>
            {images.map((_: any, idx: number) => (
              <div key={idx} onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                style={{ width: 8, height: 8, borderRadius: 9999, background: idx === currentIndex ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

