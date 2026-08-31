'use client';

import React from 'react';
import { Card } from '@/app/components/ui';
import { LinkOutlined } from '@/app/components/ui/icons';
import type { LinkCard as LinkCardType } from '@/app/types/card';

interface LinkCardProps {
  card: LinkCardType;
  onClick?: () => void;
  className?: string;
}

/**
 * F. 链接卡片
 * 外部链接预览，适合分享网页、资源
 */
export default function LinkCard({ card, onClick, className = '' }: LinkCardProps) {
  return (
    <Card
      hoverable
      id={card.id?.toString() || (card as any)._id?.toString() || ''}
      className={className}
      bodyStyle={{ padding: 0 }}
      onClick={onClick}
    >
      {/* 缩略图区域 */}
      {card.thumbnail && (
        <div style={{ 
          height: '150px',
          overflow: 'hidden',
          background: '#f5f5f5',
        }}>
          <img
            src={card.thumbnail}
            alt={card.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      {/* 信息区域：子级无 margin，用 gap 控制间距 */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* 网站图标和URL */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: 0,
        }}>
          {card.favicon ? (
            <img 
              src={card.favicon} 
              alt="favicon"
              style={{ width: '16px', height: '16px' }}
            />
          ) : (
            <LinkOutlined style={{ fontSize: '16px', color: '#999' }} />
          )}
          <span style={{
            fontSize: '12px',
            color: '#999',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {new URL(card.url).hostname}
          </span>
        </div>

        {/* 标题 */}
        <h4 style={{ 
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {card.title}
        </h4>

        {/* 描述 */}
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
          {card.description}
        </p>
      </div>
    </Card>
  );
}

