'use client';

import React, { useState } from 'react';
import { Card, Tag } from 'antd';
import type { ImageCard as ImageCardType } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';

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
      {/* 图片区域 */}
      <div style={{ position: 'relative' }}>
        {!imgLoaded && (
          <div style={{
            width: '100%',
            height: '300px',
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            加载中...
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
            display: imgLoaded ? 'block' : 'none',
            transition: 'transform 0.3s ease',
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
            <h4 style={{ 
              margin: '0 0 8px 0',
              fontSize: '16px',
              fontWeight: 600,
            }}>
              {card.title}
            </h4>
          )}

          {/* 标签 */}
          {card.tags && card.tags.length > 0 && (
            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {card.tags.slice(0, 5).map((tag: string, index: number) => {
                const colors = ['cyan', 'blue', 'geekblue', 'purple', 'magenta', 'red', 'volcano', 'orange', 'gold', 'green'];
                const color = colors[index % colors.length];
                return (
                  <Tag key={index} color={color}>
                    {tag}
                  </Tag>
                );
              })}
              {card.tags.length > 5 && (
                <Tag color="default">
                  +{card.tags.length - 5}
                </Tag>
              )}
            </div>
          )}

          {(card.description || card.excerpt) && (
            <p style={{
              margin: 0,
              color: '#666',
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
          <div style={{
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
          </div>
        </div>
      )}
    </Card>
  );
}

