'use client';

import React, { useState } from 'react';
import type { ImageCard as ImageCardType } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import { AreaChartOutlined, PictureOutlined } from '@ant-design/icons';
import { useCardBackground } from '@/app/components/ui/useCardBackground';
import { Tag, Card } from '@/app/components/ui';

interface ImageCardProps {
  card: ImageCardType | any; // 支持数据库返回的格式
  onClick?: () => void;
}

/**
 * A. 图片主导卡片
 * 大图展示，适合摄影作品、视觉内容
 */
export default function ImageCard({ card, onClick }: ImageCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  
  // 使用卡片背景颜色 Hook，基于图片卡片 ID 生成独特的渐变色
  const colors = useCardBackground(card.id?.toString() || card._id?.toString() || '');

  return (
    <Card
      hoverable
      id={card.id?.toString() || card._id?.toString() || ''}
      onClick={onClick}
      bodyStyle={{ padding: 0 }}
    >
      {/* 图片区域 */}
      <div style={{ position: 'relative', width: '100%' }}>
        {!imgLoaded && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            minHeight: '300px',
            background: colors.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}>
            {/* 加载中... */}
          </div>
        )}
        <img
          src={card.coverImage?.url || card.imageUrl || card.firstImageUrl}
          alt={card.coverImage?.title || card.title}
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            console.error('ImageCard 图片加载失败:', card.coverImage?.url || card.imageUrl || card.firstImageUrl);
            setImgLoaded(true); // 即使加载失败也隐藏加载状态
          }}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            objectFit: 'contain', // 保持图片原始宽高比，不拉伸
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            position: 'relative',
            zIndex: 2,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
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

