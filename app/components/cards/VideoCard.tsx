'use client';

import React from 'react';
import { Card } from '@/app/components/ui';
import { PlayCircleOutlined, EyeOutlined } from '@ant-design/icons';
import type { VideoCard as VideoCardType } from '@/app/types/card';

interface VideoCardProps {
  card: VideoCardType;
  onClick?: () => void;
  className?: string;
}

/**
 * E. 视频卡片
 * 视频缩略图+播放按钮，适合视频内容
 */
export default function VideoCard({ card, onClick, className = '' }: VideoCardProps) {
  return (
    <Card
      hoverable
      id={card.id?.toString() || (card as any)._id?.toString() || ''}
      className={className}
      bodyStyle={{ padding: 0 }}
      onClick={onClick}
    >
      {/* 缩略图区域 */}
      <div style={{ 
        position: 'relative',
        height: '250px',
        background: '#000',
      }}>
        <img
          src={card.thumbnail}
          alt={card.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.8,
          }}
        />
        
        {/* 播放按钮 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <PlayCircleOutlined style={{
            fontSize: '64px',
            color: 'white',
            opacity: 0.9,
          }} />
        </div>

        {/* 时长标签 */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
        }}>
          {card.duration}
        </div>
      </div>

      {/* 信息区域 */}
      <div style={{ padding: '16px' }}>
        <h4 style={{ 
          margin: '0 0 8px 0',
          fontSize: '16px',
          fontWeight: 600,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {card.title}
        </h4>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#999',
        }}>
          <span>{card.createdAt}</span>
          {card.views !== undefined && (
            <span><EyeOutlined /> {card.views}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

