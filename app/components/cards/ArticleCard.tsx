'use client';

import React from 'react';
import { ClockCircleOutlined, EditOutlined} from '@ant-design/icons';
import type { ArticleCard as ArticleCardType } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import { Tag, Card } from '@/app/components/ui';
import { useCardBackground } from '@/app/components/ui/useCardBackground';

export interface ArticleCardProps {
  card: ArticleCardType | any;
  onClick?: () => void;
  priority?: boolean;
  className?: string;
}

/**
 * B. 文章主导卡片
 * 标题+摘要+封面图，适合博客文章、长篇内容
 */
export default function ArticleCard({ card, onClick, priority = false, className = '' }: ArticleCardProps) {
  // 使用卡片背景颜色 Hook，基于文章 ID 生成独特的渐变色
  const colors = useCardBackground(card.id || card._id?.toString() || '');

  return (
    <Card
      hoverable
      id={card.id || card._id?.toString() || ''}
      onClick={onClick}
      bodyStyle={{ padding: '20px' }}
      className={className}
    >


      {/* 标题 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
          <EditOutlined style={{ fontSize: '20px'}} />
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 600,
          color: colors.textColor,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {card.title}
        </h3>
      </div>
      {/* 标签 */}
      {card.tags && card.tags.length > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {card.tags.slice(0, 5).map((tag: string, index: number) => (
            <Tag key={index} id={tag}>
              {tag}
            </Tag>
          ))}
          {card.tags.length > 5 && (
            <Tag id={`more-${card.id}`}>
              +{card.tags.length - 5}
            </Tag>
          )}
        </div>
      )}
      {/* 摘要 - 只有当有摘要时才显示 */}
      {card.excerpt && (
        <p style={{
          margin: '0 0 16px 0',
          color: colors.textColor,
          opacity: 0.8,
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
        borderTop: `1px solid ${colors.borderColor}`,
        fontSize: '12px',
        opacity: 0.6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* <span>{card.author}</span> */}
          <span style={{ fontSize: '12px' }}>
            {formatRelativeTime(card.updatedAt || card.publishedAt || card.createdAt)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {card.readTime && <span><ClockCircleOutlined /> {card.readTime}min</span>}
          {/* {(card.likes !== undefined && card.likes !== null) && <span> {card.likes}</span>} */}
          {/* {(card.comments !== undefined && card.comments !== null) && <span><MessageOutlined /> {card.comments}</span>} */}
        </div>

      </div>
    </Card>
  );
}

