'use client';

import React from 'react';
import './card-blocks.css';
import { ClockCircleOutlined, EditOutlined } from '@/app/components/ui/icons';
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

  // 布局一律以后端 blocks 为准：span 就是按这份 blocks 加总出来的，
  // 这里若自行决定显示什么，卡片内容就会和网格行高对不上。
  const blocks: any[] | undefined = card?.blocks;
  const titleBlock = blocks?.find((b) => b.type === 'title');
  const excerptBlock = blocks?.find((b) => b.type === 'excerpt');
  const dateBlock = blocks?.find((b) => b.type === 'date');
  const tagsBlock = blocks?.find((b) => b.type === 'tags');

  // 行数：优先从 blocks 中 excerpt 块的 lines 取（与 buildBlocksFromArticle 一致），否则用 layout
  const excerptLines = Math.min(
    4,
    Math.max(1, excerptBlock?.lines ?? layout?.excerptLines ?? 2)
  );
  // 标题行数以后端 blocks 为准（buildBlocksFromArticle 按列宽估的），span 就是按它加总的
  const titleLines = Math.max(1, titleBlock?.lines ?? layout?.titleLines ?? 1);

  const hasTags = card.tags && card.tags.length > 0;
  // 标签同样以后端 blocks 为准：排几行、前几个显示全，都是按列宽算好的（没有 blocks 时退回「1 个 + N」）
  const tagRows = Math.max(1, tagsBlock?.rows ?? 1);
  const visibleTags = (card.tags ?? []).slice(0, tagsBlock?.visibleCount ?? 1);
  const hiddenTagCount = (card.tags?.length ?? 0) - visibleTags.length;
  // 手机端后端不再下发 excerpt 块，这里跟着不渲染；没有 blocks 时退回原来的行为
  const excerptText = String(excerptBlock?.text ?? card.excerpt ?? '').trim();
  const hasExcerpt = blocks ? !!excerptBlock && !!excerptText : !!excerptText;
  const parentName = card.categoryName ?? (card as any).category_name ?? '';
  const hasMeta = !!parentName || card.updatedAt != null || card.publishedAt != null || card.createdAt != null;
  // 手机端 date 块带 author：左边时间、右边作者
  const metaAuthor: string | undefined = dateBlock?.author;
  const relativeTime = formatRelativeTime(card.updatedAt || card.publishedAt || card.createdAt);

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
      <div
        className="card-block-title card-block--title"
        style={{ ['--title-lines' as any]: titleLines }}
      >
        {/* <EditOutlined style={{ fontSize: '20px' }} /> */}
        <h3
          className="card-block-title__text"
          style={{ color: colors.textColor }}
        >
          {card.title}
        </h3>
      </div>
      <div className="card-block--gap" aria-hidden />
      {hasTags && (
        <>
          <div
            className="card-block-tags card-block--tags"
            style={{ ['--tags-rows' as any]: tagRows }}
          >
            {visibleTags.map((tag: string, index: number) => (
              <Tag key={index} id={tag}>{tag}</Tag>
            ))}
            {hiddenTagCount > 0 && <Tag id={`more-${card.id}`}>+{hiddenTagCount}</Tag>}
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
              {excerptText.split('\n').map((line: string) => line.replace(/^(  )+/g, '')).join(' ')}
            </p>
          </div>
          <div className="card-block--gap" aria-hidden />
        </>
      )}
      {hasMeta && (
        <>
          <div
            className="card-block--divider"
            style={{ borderTop: `1px solid ${colors.borderColor}`, boxSizing: 'border-box' }}
            aria-hidden
          />
          <div className="card-block--gap" aria-hidden />
          <div className="card-block-meta card-block--date">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: colors.textColor }}>
              {/* 手机端这一行只留右下角的作者，不显示时间；桌面端维持原样 */}
              {!metaAuthor && <span>{parentName || relativeTime}</span>}
            </div>
            <div style={{ display: 'flex', gap: '12px', color: colors.textColor }}>
              {metaAuthor && <span className="card-block-meta__author">{metaAuthor}</span>}
              {card.readTime && <span><ClockCircleOutlined /> {card.readTime}min</span>}
            </div>
          </div>
        </>
      )}
      <div className="card-block--pad-bottom" aria-hidden />
    </Card>
  );
}

