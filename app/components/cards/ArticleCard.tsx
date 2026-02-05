'use client';

import React from 'react';
import './card-blocks.css';
import { ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import type { ArticleCard as ArticleCardType, MasonryProps } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import { Tag, Card } from '@/app/components/ui';
import { useCardBackground } from '@/app/components/ui/useCardBackground';

export interface ArticleCardProps {
  card: ArticleCardType | any;
  onClick?: () => void;
  onMouseEnter?: () => void;
  priority?: boolean;
  className?: string;
}

/**
 * B. 文章主导卡片（块状样式见 card-blocks.css）
 */
export default function ArticleCard({
  card,
  onClick,
  onMouseEnter,
  priority = false,
  className = '',
  masonry,
  span,
  layout,
}: ArticleCardProps & MasonryProps) {
  const colors = useCardBackground(card.id || card._id?.toString() || '');
  // 行数：优先从 blocks 中 excerpt 块的 lines 取（与 buildBlocksFromArticle 一致），否则用 layout
  const excerptLinesFromBlocks =
    card?.blocks?.find((b: { type?: string; lines?: number }) => b.type === 'excerpt')?.lines;
  const excerptLines = Math.min(
    4,
    Math.max(1, excerptLinesFromBlocks ?? layout?.excerptLines ?? 2)
  );

  const hasTags = card.tags && card.tags.length > 0;
  const hasExcerpt = !!card.excerpt;
  const hasDate = card.updatedAt != null || card.publishedAt != null || card.createdAt != null;

  return (
    <Card
      hoverable
      id={card.id || card._id?.toString() || ''}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      borderSides="x"
      bodyStyle={{ padding: '0 20px', display: 'flex', flexDirection: 'column' }}
      className={[className, masonry && 'masonry-item'].filter(Boolean).join(' ') || undefined}
      style={span != null ? { gridRow: `span ${span}` } : undefined}
      dataMasonry={masonry || undefined}
      dataMasonrySpan={span != null ? span : undefined}
      dataCardId={card.id || card._id?.toString() || ''}
      dataCardType="TEXT_CARD"
    >
      <div className="card-block--pad-top" aria-hidden />
      <div className="card-block-title card-block--title">
        <EditOutlined style={{ fontSize: '20px' }} />
        <h3 className="card-block-title__text" style={{ color: colors.textColor }}>
          {card.title}
        </h3>
      </div>
      <div className="card-block--gap" aria-hidden />
      {hasTags && (
        <>
          <div className="card-block-tags card-block--tags">
            {card.tags!.slice(0, 1).map((tag: string, index: number) => (
              <Tag key={index} id={tag}>{tag}</Tag>
            ))}
            {card.tags!.length > 1 && <Tag id={`more-${card.id}`}>+{card.tags!.length - 1}</Tag>}
          </div>
          <div className="card-block--gap" aria-hidden />
        </>
      )}
      {hasExcerpt && (
        <>
          <div className={`card-block-excerpt-wrap card-block--excerpt-lines-${excerptLines}`}>
            <p
              className={`card-block-excerpt card-block--excerpt-lines-${excerptLines}`}
              style={{ color: colors.textColor }}
            >
              {card.excerpt!.split('\n').map((line: string) => line.replace(/^(  )+/g, '')).join(' ')}
            </p>
          </div>
          <div className="card-block--gap" aria-hidden />
        </>
      )}
      {hasDate && (
        <>
          <div
            className="card-block--divider"
            style={{ borderTop: `1px solid ${colors.borderColor}`, boxSizing: 'border-box' }}
            aria-hidden
          />
          <div className="card-block--gap" aria-hidden />
          <div className="card-block-meta card-block--date">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: colors.textColor }}>
              <span>{formatRelativeTime(card.updatedAt || card.publishedAt || card.createdAt)}</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {card.readTime && <span><ClockCircleOutlined /> {card.readTime}min</span>}
            </div>
          </div>
        </>
      )}
      <div className="card-block--pad-bottom" aria-hidden />
    </Card>
  );
}

