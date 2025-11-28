'use client';

import React from 'react';
import { Card } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import type { LinkCard as LinkCardType } from '@/app/types/card';

interface LinkCardProps {
  card: LinkCardType;
  onClick?: () => void;
}

/**
 * F. 链接卡片
 * 外部链接预览，适合分享网页、资源
 */
export default function LinkCard({ card, onClick }: LinkCardProps) {
  return (
    <Card
      hoverable
      style={{ 
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e8e8e8',
      }}
      styles={{ body: { padding: 0 } }}
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

      {/* 信息区域 */}
      <div style={{ padding: '16px' }}>
        {/* 网站图标和URL */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
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
        }}>
          {card.description}
        </p>
      </div>
    </Card>
  );
}

