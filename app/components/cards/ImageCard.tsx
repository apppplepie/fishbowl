'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { ImageCard as ImageCardType } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import { AreaChartOutlined, PictureOutlined } from '@ant-design/icons';
import { useCardBackground } from '@/app/components/ui/useCardBackground';
import { Tag, Card } from '@/app/components/ui';

export interface ImageCardProps {
  card: ImageCardType | any;
  onClick?: () => void;
  priority?: boolean;
  className?: string;
}

/**
 * A. 图片主导卡片
 * 大图展示，适合摄影作品、视觉内容
 */
export default function ImageCard({ card, onClick, priority = false, className = '' }: ImageCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const colors = useCardBackground(card.id?.toString() || card._id?.toString() || '');

  // 🔑 计算图片的 aspect ratio（优先使用实际尺寸，否则默认 3:2）
  const imageWidth = card.coverImage?.width || card.imageWidth;
  const imageHeight = card.coverImage?.height || card.imageHeight;
  const aspectRatio = imageWidth && imageHeight 
    ? `${imageWidth} / ${imageHeight}` 
    : '3 / 2'; // 默认 3:2 比例

  return (
    <Card
      hoverable
      id={card.id?.toString() || card._id?.toString() || ''}
      className={className}
      onClick={onClick}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ 
        position: 'relative', 
        width: '100%',
        maxWidth: '100%',
        aspectRatio: aspectRatio, // 🔑 使用实际比例或默认比例
        background: colors.background,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}>
        <Image
          src={card.coverImage?.url || card.imageUrl || card.firstImageUrl}
          alt={card.coverImage?.title || card.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1440px) 25vw, 400px" 
          /* 响应式尺寸: 小屏2列(50%), 中屏3列(33%), 大屏4列(25%) */
          style={{
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
            maxWidth: '100%', /* 防止撑开父容器 */
          }}
          className="hover-scale-image"
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            console.error('ImageCard 图片加载失败:', card.coverImage?.url || card.imageUrl || card.firstImageUrl);
            setImgLoaded(true);
          }}
          loading={priority ? 'eager' : 'lazy'} // ✅ 首屏立即加载
          priority={priority} // ✅ 首屏优先级
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI2NyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI2NyIgZmlsbD0iI2YwZjBmMCIvPjwvc3ZnPg=="
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
          
          {/* 底部信息 */}
          {/* <div style={{
            marginTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#999',
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
              {card.author && <span>👤 {card.author}</span>}
              <span style={{ color: '#999' }}>
                📝 {formatRelativeTime(card.updatedAt || card.publishedAt || card.createdAt)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {(card.likes !== undefined && card.likes !== null) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ❤️ {card.likes}
                </span>
              )}
            </div>
          </div> */}
        </div>
      )}
    </Card>
  );
}

