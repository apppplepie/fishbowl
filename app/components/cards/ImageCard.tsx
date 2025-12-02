'use client';

import React, { useState } from 'react';
import { Card } from 'antd';
import { HeartOutlined, HeartFilled } from '@ant-design/icons';
import type { ImageCard as ImageCardType } from '@/app/types/card';

interface ImageCardProps {
  card: ImageCardType | any; // 支持数据库返回的格式
  onClick?: () => void;
}

/**
 * A. 图片主导卡片
 * 大图展示，适合摄影作品、视觉内容
 */
export default function ImageCard({ card, onClick }: ImageCardProps) {
  const [liked, setLiked] = useState(false);
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
          src={card.imageUrl || card.firstImageUrl}
          alt={card.title}
          onLoad={() => setImgLoaded(true)}
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {card.author && <span>👤 {card.author}</span>}
              <span>📅 {card.publish_date || card.createdAt}</span>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                setLiked(!liked);
              }}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {liked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
              <span>{(card.likes || 0) + (liked ? 1 : 0)}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

