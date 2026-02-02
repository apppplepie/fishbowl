'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { ImageCard as ImageCardType, MasonryProps } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import { AreaChartOutlined, PictureOutlined } from '@ant-design/icons';
import { useCardBackground } from '@/app/components/ui/useCardBackground';
import { Tag, Card } from '@/app/components/ui';

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
      className={[className, masonry && 'masonry-item'].filter(Boolean).join(' ') || undefined}
      onClick={onClick}
      bodyStyle={{ padding: 0 }}
      dataMasonry={masonry || undefined}
      dataCardId={card.id?.toString() || card._id?.toString() || ''}
      dataCardType="IMAGE_CARD"
    >
      <div style={{ 
        position: 'relative', 
        width: '100%',
        maxWidth: '100%',
        aspectRatio: aspectRatio,
        contain: 'layout paint',
        containIntrinsicSize: '400px 300px',
        background: colors.background,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}>
        <Image
          src={media?.url || card.imageUrl || card.firstImageUrl}
          alt={media?.title || card.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1440px) 25vw, 400px"
          style={{
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
            maxWidth: '100%',
          }}
          className="hover-scale-image"
          onLoadingComplete={() => setImgLoaded(true)}
          onError={() => {
            console.error('ImageCard 图片加载失败:', media?.url || card.imageUrl || card.firstImageUrl);
            setImgLoaded(true);
          }}
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
          placeholder={media?.blur_data_url ? 'blur' : 'empty'}
          blurDataURL={media?.blur_data_url ?? undefined}
        />
      </div>

      {/* 信息区域 */}
      {(card.title || card.description || card.excerpt) && (
        <div style={{ padding: '16px' }}>
          {card.title && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}>
              <PictureOutlined style={{ fontSize: '20px'}} />
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: colors.textColor,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {card.title}
              </h3>
            </div>
          )}

          {/* 标签 */}
          {card.tags && card.tags.length > 0 && (
            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {card.tags.slice(0, 5).map((tag: string, index: number) => (
                <Tag key={index} id={tag}>
                  {tag}
                </Tag>
              ))}
              {card.tags.length > 5 && (
                <Tag id={`more-${card.id || card._id || ''}`}>
                  +{card.tags.length - 5}
                </Tag>
              )}
            </div>
          )}

          {(card.description || card.excerpt) && (
            <p style={{
              margin: 0,
              color: colors.textColor,
              opacity: 0.8,
              fontSize: '14px',
              lineHeight: '1.5',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
            }}>
              {card.description || card.excerpt}
            </p>
          )}
          
        </div>
      )}
    </Card>
  );
}

