'use client';

import React from 'react';
import { Card, Tag } from 'antd';
import { UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { BookCard as BookCardType } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';

interface BookCardProps {
  card: BookCardType;
  onClick?: () => void;
}

/**
 * G. 书籍卡片
 * 展示书籍信息，包含封面图、书名、作者、更新日期
 * 封面图来自该目录下 order_in_category 最小的文章的第一张图片
 * 点击跳转到书籍详情页 /book/[id]
 */
export default function BookCard({ card, onClick }: BookCardProps) {
  return (
    <Card
      hoverable
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
      }}
      styles={{ body: { padding: '16px' } }}
      onClick={onClick}
      cover={
        <div style={{
          position: 'relative',
          height: '280px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
          {card.coverImage ? (
            <img
              src={card.coverImage}
              alt={card.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              📚 {card.title}
            </div>
          )}
          {/* 渐变遮罩 */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
          }} />
        </div>
      }
    >

      {/* 书名 */}
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: 700,
        lineHeight: '1.3',
        color: '#1a1a1a',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {card.title}
      </h3>

      {/* 简介 - 只有当有简介时才显示 */}
      {card.description && (
        <p style={{
          margin: '0 0 16px 0',
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
      )}

      {/* 元信息 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '12px',
        borderTop: '1px solid #f0f0f0',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#666'
        }}>
          <UserOutlined />
          <span>{card.author}</span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          color: '#999'
        }}>
          <ClockCircleOutlined />
          <span>{formatRelativeTime(card.updatedAt)}</span>
        </div>
      </div>

      {/* 悬停效果样式 */}
      <style jsx>{`
        .ant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </Card>
  );
}
