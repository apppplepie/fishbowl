import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useResponsive } from '@/app/hooks/useResponsive';
import { getImageSrc } from '@/lib/imageUrl';
import { PlaceholderBlock } from '@/app/types/block';
import PlaceholderDisplay from '@/app/components/blocks/PlaceholderDisplay';

const DEFAULT_ASPECT = 3 / 2;
const toValidAspect = (value: number): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : DEFAULT_ASPECT;

type DrawingGalleryCardProps = {
  article: any;
  /** 外部传入封面宽，用于首帧占位，不依赖详情接口 */
  coverWidth?: number;
  /** 外部传入封面高，用于首帧占位 */
  coverHeight?: number;
  /** 外部传入缩略图（blur base64 或低清图 URL），用于占位加载 */
  coverThumbnail?: string;
  /** 封面模式：只显示图组中 access_level 最小且 order 最小的那一张图，不显示标题/指示点等 */
  coverOnly?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onTitleClick?: () => void;
  style?: React.CSSProperties;
};

export default function DrawingGalleryCard({
  article,
  coverWidth: propCoverWidth,
  coverHeight: propCoverHeight,
  coverThumbnail: propCoverThumbnail,
  coverOnly = false,
  onClick,
  onTitleClick,
  style,
}: DrawingGalleryCardProps) {
  const { isMobile } = useResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const touchStartRef = useRef<number | null>(null);
  const hasSwipedRef = useRef(false);

  const coverMedia = article?.cover_image ?? article?.coverImage ?? null;
  const coverUrl = article?.cover_image_url ?? article?.cover_image?.url ?? article?.coverImage?.url ?? article?.imageUrl ?? null;

  const images = useMemo(() => {
    const coverMedia = article?.cover_image ?? article?.coverImage ?? null;
    const coverUrl = article?.cover_image_url ?? article?.cover_image?.url ?? article?.coverImage?.url ?? article?.imageUrl ?? null;
    const blockList = (article?.blocks || [])
      .filter((block: any) => block.type === 'image' || (block.type === 'placeholder' && block.original_type === 'image'))
      .sort((a: any, b: any) => a.order - b.order);

    if (blockList.length === 0) {
      if (propCoverWidth != null && propCoverHeight != null && propCoverWidth > 0 && propCoverHeight > 0 && coverUrl) {
        return [{
          id: 'cover',
          type: 'image',
          url: coverUrl,
          placeholderData: null,
          order: 0,
          aspectRatio: toValidAspect(propCoverWidth / propCoverHeight),
          blur_data_url: propCoverThumbnail ?? coverMedia?.blur_data_url ?? (coverMedia as any)?.blurDataUrl ?? null,
        }];
      }
      return [];
    }

    return blockList.map((block: any, idx: number) => {
      const media = block.media ?? (idx === 0 ? coverMedia : null);
      const w = idx === 0 && propCoverWidth != null ? propCoverWidth : media?.width;
      const h = idx === 0 && propCoverHeight != null ? propCoverHeight : media?.height;
      const ar = media?.aspect_ratio ?? (media as any)?.aspect_ratio;
      const computedFromSize = w != null && h != null && Number(h) > 0 ? toValidAspect(Number(w) / Number(h)) : null;
      const computedFromApi = ar != null && ar !== '' ? toValidAspect(Number(ar)) : null;
      const aspectRatio = computedFromSize ?? computedFromApi ?? DEFAULT_ASPECT;
      const blurUrl = idx === 0 && propCoverThumbnail != null ? propCoverThumbnail : (media?.blur_data_url ?? (media as any)?.blurDataUrl ?? null);
      return {
        id: block.id,
        type: block.type,
        url: block.type === 'image' ? block.parsedContent?.url ?? null : null,
        placeholderData: block.type === 'placeholder' ? block : null,
        order: block.order,
        aspectRatio,
        blur_data_url: blurUrl,
      };
    });
  }, [article, propCoverWidth, propCoverHeight, propCoverThumbnail]);

  useEffect(() => {
    if (images.length > 0 && currentIndex >= images.length) setCurrentIndex(0);
  }, [images.length, currentIndex]);

  const currentImage = images[currentIndex];

  const minSwipeDistance = 50;

  const handleTapOrClick = (e: React.MouseEvent) => {
    if (hasSwipedRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const leftThird = rect.width / 3;
    const rightThird = rect.width * 2 / 3;
    if (x < leftThird) setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    else if (x > rightThird) setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
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
      setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    } else if (distance < -minSwipeDistance) {
      setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    }
    touchStartRef.current = null;
    setTimeout(() => { hasSwipedRef.current = false; }, 250);
  };

  const markFailed = () => setFailedImages(prev => new Set(prev).add(currentIndex));

  // 封面模式：后端已定封面，按长宽比直接显示，无壳
  if (coverOnly) {
    const w = coverMedia?.width ?? propCoverWidth ?? 300;
    const h = coverMedia?.height ?? propCoverHeight ?? 400;
    const aspectRatio = toValidAspect(w / h);
    if (!coverUrl) {
      return (
        <div onClick={onClick} style={{ position: 'relative', width: '100%', aspectRatio, overflow: 'hidden', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#999', ...style }}>
          暂无封面
        </div>
      );
    }
    const blur = coverMedia?.blur_data_url ?? (coverMedia as any)?.blurDataUrl ?? propCoverThumbnail ?? undefined;
    return (
      <div
        onClick={onClick}
        style={{ position: 'relative', width: '100%', aspectRatio, overflow: 'hidden', ...style }}
      >
        <Image
          src={getImageSrc(coverUrl) ?? coverUrl}
          alt={article?.title ?? '作品封面'}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          style={{ objectFit: 'cover' }}
          loading="lazy"
          placeholder={blur ? 'blur' : 'empty'}
          blurDataURL={blur}
          draggable={false}
        />
      </div>
    );
  }

  if (!currentImage) {
    return (
      <div style={{ width: '100%', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, overflow: 'hidden', background: '#f6f6f6', ...style }} onClick={onClick}>
        <div style={{ color: '#888' }}>没有可显示的图片</div>
      </div>
    );
  }

  return (
    <div role="button" tabIndex={0} onClick={onClick} style={{ width: '100%', maxWidth: '90vw', maxHeight: '90vh', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'transparent', touchAction: 'pan-y', ...style }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div onClick={handleTapOrClick} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {failedImages.has(currentIndex) ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <div style={{ color: '#fff', background: 'linear-gradient(90deg,#ff7a7a,#ff5a9b)', padding: 12, borderRadius: 8 }}>
              图片加载失败
            </div>
          </div>
        ) : currentImage.type === 'placeholder' && currentImage.placeholderData ? (
          <div style={{ width: '100%', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlaceholderDisplay block={currentImage.placeholderData} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          </div>
        ) : currentImage.url ? (
          <div style={{ width: '100%', maxWidth: '90vw', maxHeight: '90vh', aspectRatio: currentImage.aspectRatio, position: 'relative', contain: 'layout paint', background: 'transparent', overflow: 'hidden' }}>
            <Image src={getImageSrc(currentImage.url) ?? currentImage.url} alt={article.title || 'image'} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 80vw, 90vw" style={{ objectFit: 'contain', transition: 'transform 0.28s ease, opacity 0.28s ease' }} onError={markFailed} loading="lazy" placeholder={currentImage.blur_data_url ? 'blur' : 'empty'} blurDataURL={currentImage.blur_data_url ?? undefined} draggable={false} />
          </div>
        ) : (
          <div style={{ color: '#888' }}>图片不可用</div>
        )}

        <div onClick={(e) => { e.stopPropagation(); onTitleClick?.(); }} style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 3, maxWidth: 'calc(100% - 24px)', padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.45)', color: '#fff', fontWeight: 600, fontSize: isMobile ? 14 : 16, lineHeight: 1.2, backdropFilter: 'blur(6px)', cursor: 'pointer' }}>
          {article.title}
        </div>

        {images.length > 1 && (
          <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 3, display: 'flex', gap: 8 }}>
            {images.map((_: any, idx: number) => (
              <div key={idx} onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }} style={{ width: 8, height: 8, borderRadius: 9999, background: idx === currentIndex ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
