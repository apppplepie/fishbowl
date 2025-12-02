'use client';

import React from 'react';
import { Card } from 'antd';
import type { DiaryCard as DiaryCardType } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';

interface DiaryCardProps {
  card: DiaryCardType | any; // 支持数据库返回的格式
  onClick?: () => void;
}

/**
 * C. 日记卡片
 * 简短文字记录，适合每日感想、随笔
 */
export default function DiaryCard({ card, onClick }: DiaryCardProps) {
  return (
    <Card
      hoverable
      style={{ 
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
        border: 'none',
      }}
      styles={{ body: { padding: '20px' } }}
      onClick={onClick}
    >
      {/* 标题（日期） */}
      {card.title && (
        <h4 style={{
          margin: '0 0 8px 0',
          fontSize: '16px',
          fontWeight: 600,
          color: '#333',
        }}>
          {card.title}
        </h4>
      )}

      {/* 日期和心情 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        fontSize: '12px',
        color: '#666',
      }}>
        <span>📝 {formatRelativeTime(card.last_modified || card.publish_date || card.createdAt)}</span>
        <span>{card.mood || '😊'}</span>
      </div>

      {/* 日记内容 */}
      <p style={{
        margin: '0 0 12px 0',
        fontSize: '15px',
        lineHeight: '1.8',
        color: '#333',
        whiteSpace: 'pre-wrap',
        display: '-webkit-box',
        WebkitLineClamp: 4,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {card.content || card.excerpt}
      </p>

      {/* 底部信息 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        fontSize: '12px',
        color: '#999',
        paddingTop: '12px',
        borderTop: '1px solid rgba(0,0,0,0.1)',
      }}>
        {card.weather && <span>{card.weather}</span>}
        {card.location && <span>📍 {card.location}</span>}
      </div>
    </Card>
  );
}

