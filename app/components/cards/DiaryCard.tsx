'use client';

import React from 'react';
import { Card } from 'antd';
import type { DiaryCard as DiaryCardType } from '@/app/types/card';

interface DiaryCardProps {
  card: DiaryCardType;
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
      {/* 日期和心情 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        fontSize: '14px',
        color: '#666',
      }}>
        <span>📅 {card.createdAt}</span>
        <span>{card.mood || '😊'}</span>
      </div>

      {/* 日记内容 */}
      <p style={{
        margin: '0 0 12px 0',
        fontSize: '15px',
        lineHeight: '1.8',
        color: '#333',
        whiteSpace: 'pre-wrap',
      }}>
        {card.content}
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

