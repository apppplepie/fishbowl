'use client';

import React from 'react';
import './card-blocks.css';
import { ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import { Card, Tag } from '@/app/components/ui';
import { useCardBackground } from '@/app/components/ui/useCardBackground';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import type { ArticleBlock } from '@/lib/lib-card-layout/buildBlocksFromArticle';
import { BLOCK_SPANS } from '@/lib/lib-card-layout/constants';

const GAP_SPAN = BLOCK_SPANS.GAP ?? 1;

function getBlockSpan(block: ArticleBlock): number {
  if (block.type === 'gap') return GAP_SPAN;
  if ('span' in block && typeof (block as { span?: number }).span === 'number') {
    return (block as { span: number }).span;
  }
  return 0;
}

function BlockRenderer({
  block,
  colors,
}: {
  block: ArticleBlock;
  colors: { textColor: string; borderColor?: string };
}) {
  const span = getBlockSpan(block);
  const style = { ['--span' as string]: span } as React.CSSProperties;

  switch (block.type) {
    case 'pad-top':
    case 'pad-bottom':
      return <div className="card-block card-block-pad" style={style} aria-hidden />;
    case 'gap':
      return <div className="card-block card-block--gap" style={style} aria-hidden />;
    case 'title':
      return (
        <div className="card-block card-block-title" style={style}>
          <EditOutlined style={{ fontSize: 20 }} />
          <h3 className="card-block-title__text" style={{ color: colors.textColor }}>
            {block.text}
          </h3>
        </div>
      );
    case 'tags':
      return (
        <div className="card-block card-block-tags" style={style}>
          {block.tags.slice(0, 1).map((t: string, i: number) => (
            <Tag key={i} id={t}>
              {t}
            </Tag>
          ))}
          {block.tags.length > 1 && (
            <Tag id={`more-${block.tags.length}`}>+{block.tags.length - 1}</Tag>
          )}
        </div>
      );
    case 'excerpt':
      return (
        <div className="card-block card-block-excerpt-wrap" style={style}>
          <p
            className="card-block-excerpt"
            style={{
              color: colors.textColor,
              WebkitLineClamp: block.lines ?? Math.max(1, Math.ceil((block.span || 0) / BLOCK_SPANS.EXCERPT_LINE)),
            } as React.CSSProperties}
          >
            {block.text}
          </p>
        </div>
      );
    case 'divider':
      return (
        <div
          className="card-block card-block--divider"
          style={{
            ...style,
            borderTop: colors.borderColor ? `1px solid ${colors.borderColor}` : undefined,
          }}
          aria-hidden
        />
      );
    case 'date':
      return (
        <div className="card-block card-block-meta" style={style}>
          <div className="meta-left" style={{ color: colors.textColor }}>
            {formatRelativeTime(block.value)}
          </div>
          <div className="meta-right">
            <ClockCircleOutlined />
          </div>
        </div>
      );
    default:
      return null;
  }
}

export interface ArticleCardBlocksProps {
  card: { id?: string; _id?: string | number };
  blocks: ArticleBlock[];
  span?: number | null;
  onClick?: () => void;
  onMouseEnter?: () => void;
  className?: string;
  masonry?: boolean;
}

/**
 * 文章卡（blocks 驱动）：后端给 blocks[] + precomputedSpan，前端只按块画盒子，高度 = --span * 8px。
 */
export default function ArticleCardBlocks({
  card,
  blocks,
  span,
  onClick,
  onMouseEnter,
  className = '',
  masonry,
}: ArticleCardBlocksProps) {
  const colors = useCardBackground(card?.id?.toString() || card?._id?.toString() || '');
  const effectiveSpan = span ?? null;

  return (
    <Card
      hoverable
      id={card?.id?.toString() || card?._id?.toString() || ''}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      borderSides="x"
      bodyStyle={{ padding: '0 20px', display: 'flex', flexDirection: 'column' }}
      className={[className, masonry && 'masonry-item'].filter(Boolean).join(' ') || undefined}
      style={effectiveSpan != null ? { gridRow: `span ${effectiveSpan}` } : undefined}
      dataMasonry={masonry || undefined}
      dataMasonrySpan={effectiveSpan ?? undefined}
      dataCardId={card?.id?.toString() || card?._id?.toString() || ''}
      dataCardType="TEXT_CARD"
    >
      {blocks.map((b, i) => (
        <BlockRenderer key={i} block={b} colors={colors} />
      ))}
    </Card>
  );
}
