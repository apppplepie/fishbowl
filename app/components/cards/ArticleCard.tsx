'use client';

import React from 'react';
import { Card, Tag } from 'antd';
import { ClockCircleOutlined, EyeOutlined, MessageOutlined } from '@ant-design/icons';
import type { ArticleCard as ArticleCardType } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';

interface ArticleCardProps {
  card: ArticleCardType | any; // 支持数据库返回的格式
  onClick?: () => void;
}

/**
 * B. 文章主导卡片
 * 标题+摘要+封面图，适合博客文章、长篇内容
 */
export default function ArticleCard({ card, onClick }: ArticleCardProps) {
  return (
    <Card
      hoverable
      style={{ 
        borderRadius: '12px',
        overflow: 'hidden',
      }}
      styles={{ body: { padding: '20px' } }}
      onClick={onClick}
      cover={
        card.coverImage ? (
          <div style={{ 
            height: '200px', 
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}>
            <img
              src={card.coverImage}
              alt={card.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        ) : undefined
      }
    >
      {/* 标签 */}
      {card.tags && card.tags.length > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {card.tags.slice(0, 5).map((tag: string, index: number) => {
            const colors = ['magenta', 'red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'];
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

      {/* 标题 */}
      <h3 style={{
        margin: '0 0 12px 0',
        fontSize: '18px',
        fontWeight: 600,
        lineHeight: '1.4',
      }}>
        {card.title}
      </h3>

      {/* 摘要 - 只有当有摘要时才显示 */}
      {card.excerpt && (
        <p style={{
          margin: '0 0 16px 0',
          color: '#666',
          fontSize: '14px',
          lineHeight: '1.6',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
        }}>
          {card.excerpt}
        </p>
      )}

      {/* 元信息 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '12px',
        borderTop: '1px solid #f0f0f0',
        fontSize: '12px',
        color: '#999',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>✍️ {card.author}</span>
          <span style={{ color: '#999', fontSize: '12px' }}>
            📝 {formatRelativeTime(card.last_modified || card.publish_date || card.createdAt)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {card.readTime && <span><ClockCircleOutlined /> {card.readTime}min</span>}
          {(card.likes !== undefined && card.likes !== null) && <span>❤️ {card.likes}</span>}
          {(card.comments !== undefined && card.comments !== null) && <span><MessageOutlined /> {card.comments}</span>}
        </div>
      </div>
    </Card>
  );
}

