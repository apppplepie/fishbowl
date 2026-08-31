'use client';

import React, { useState } from 'react';
import './card-blocks.css';
import Image from 'next/image';
import type { ImageCard as ImageCardType, MasonryProps } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import { AreaChartOutlined, PictureOutlined } from '@/app/components/ui/icons';
import { useCardBackground } from '@/app/components/ui/useCardBackground';
import { Card } from '@/app/components/ui';
import { getImageSrc } from '@/lib/imageUrl';

export interface ImageCardProps {
  card: ImageCardType | any;
  onClick?: () => void;
  onMouseEnter?: () => void;
  priority?: boolean;
  className?: string;
}

/**
 * A. 图片主导卡片
 * 大图展示，适合摄影作品、视觉内容
 */
export default function ImageCard({
  card,
  onClick,
  onMouseEnter,
  priority = false,
  className = '',
  masonry,
  span,
  layout,
  dynamic: _dynamic,
}: ImageCardProps & MasonryProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const colors = useCardBackground(card.id?.toString() || card._id?.toString() || '');

  // 兼容 camelCase（list API）与 snake_case（部分 API 原始返回）
  const media = card.coverImage ?? card.cover_image ?? null;
  const imageWidth = media?.width ?? card.imageWidth;
  const imageHeight = media?.height ?? card.imageHeight;
  const apiAspectRatio = media?.aspect_ratio;

  const DEFAULT_ASPECT = 3 / 2;
  const toValidAspect = (value: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : DEFAULT_ASPECT;

  // 比例只来自数据（API/DB width、height、aspect_ratio），不依赖图片加载结果，避免布局抖动
  const computedFromApi =
    apiAspectRatio != null && apiAspectRatio !== ''
      ? toValidAspect(Number(apiAspectRatio))
      : null;
  const computedFromSize =
    imageWidth != null && imageHeight != null && Number(imageWidth) > 0 && Number(imageHeight) > 0
      ? toValidAspect(Number(imageWidth) / Number(imageHeight))
      : null;
  const aspectRatio = computedFromApi ?? computedFromSize ?? DEFAULT_ASPECT;

  return (
    <Card
      hoverable
      id={card.id?.toString() || card._id?.toString() || ''}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      borderSides="x"
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column' }}
      className={[className, masonry && 'masonry-item'].filter(Boolean).join(' ') || undefined}
      style={span != null ? { gridRow: `span ${span}` } : undefined}
      dataMasonry={masonry || undefined}
      dataMasonrySpan={span != null ? span : undefined}
      dataCardId={card.id?.toString() || card._id?.toString() || ''}
      dataCardType="IMAGE_CARD"
    >
      <div
        className="image-card-media"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          aspectRatio: aspectRatio,
          contain: 'layout paint',
          background: colors.background,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <Image
          src={getImageSrc(media?.url || card.imageUrl || card.firstImageUrl) ?? (media?.url || card.imageUrl || card.firstImageUrl)}
          alt={media?.title || card.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1440px) 25vw, 400px"
          style={{ objectFit: 'cover', transition: 'transform 0.3s ease', maxWidth: '100%' }}
          className="hover-scale-image"
          onLoad={() => setImgLoaded(true)}
          onError={() => { setImgLoaded(true); }}
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
          placeholder={media?.blur_data_url ? 'blur' : 'empty'}
          blurDataURL={media?.blur_data_url ?? undefined}
        />
      </div>
      <div className="card-block--gap" aria-hidden />
      {card.title ? (
        <div className="card-block-title card-block-title--image card-block--title" style={{ padding: '0 20px' }}>
          <PictureOutlined style={{ fontSize: '20px' }} />
          <h3 className="card-block-title__text" style={{ color: colors.textColor }}>
            {card.title}
          </h3>
        </div>
      ) : <div className="card-block--title" style={{ padding: '0 20px' }} aria-hidden />}
      <div className="card-block--pad-bottom" aria-hidden />
    </Card>
  );
}

