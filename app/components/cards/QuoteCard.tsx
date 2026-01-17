'use client';

import React from 'react';
import { Card } from 'antd';
import type { QuoteCard as QuoteCardType } from '@/app/types/card';

interface QuoteCardProps {
  card: QuoteCardType;
  onClick?: () => void;
  className?: string;
}

/**
 * D. 引言/名言卡片
 * 展示格言、名句，适合灵感分享
 */
export default function QuoteCard({ card, onClick, className = '' }: QuoteCardProps) {
  return (
    <Card
      hoverable
      className={className}
      style={{ 
        borderRadius: '12px',
        background: card.backgroundColor || 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        border: 'none',
      }}
      styles={{ 
        body: { 
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '200px',
        } 
      }}
      onClick={onClick}
    >
      {/* 引号图标 */}
      <div style={{
        fontSize: '48px',
        color: 'rgba(0,0,0,0.1)',
        lineHeight: 1,
        marginBottom: '16px',
      }}>
        "
      </div>

      {/* 引言内容 */}
      <p style={{
        margin: '0 0 20px 0',
        fontSize: '16px',
        lineHeight: '1.8',
        color: '#333',
        fontStyle: 'italic',
      }}>
        {card.quote}
      </p>

      {/* 作者 */}
      <div style={{
        textAlign: 'right',
        fontSize: '14px',
        color: '#666',
        fontWeight: 500,
      }}>
        — {card.author}
      </div>
    </Card>
  );
}

