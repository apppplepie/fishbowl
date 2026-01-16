import React from 'react';
import { ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import type { ArticleCard as ArticleCardType } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import { generateVisualsFromId } from '@/app/components/ui/colorUtils';

export interface ArticleCardServerProps {
  card: ArticleCardType | any;
  priority?: boolean;
}

/**
 * ArticleCard Server Component 版本
 * 用于首屏 SSR，无客户端交互，无 hydration
 */
export default function ArticleCardServer({ card, priority = false }: ArticleCardServerProps) {
  const cardId = card.id || card._id?.toString() || '';
  const colors = generateVisualsFromId(cardId);

  return (
    <div
      className="relative break-inside-avoid group"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        borderRadius: '12px',
        overflow: 'hidden',
        background: colors.background,
        color: colors.textColor,
        border: `1px solid ${colors.borderColor}`,
        boxShadow: `0 8px 30px -6px ${colors.shadowColor}, 0 4px 12px -4px rgba(0,0,0,0.1)`,
      }}
    >
      {/* Subtle Noise Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Body 区域 */}
      <div className="relative z-10" style={{ padding: '20px' }}>
        {/* 标题 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <EditOutlined style={{ fontSize: '20px' }} />
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: colors.textColor,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {card.title}
          </h3>
        </div>

        {/* 标签 */}
        {card.tags && card.tags.length > 0 && (
          <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {card.tags.slice(0, 5).map((tag: string, index: number) => {
              const tagColors = generateVisualsFromId(tag);
              return (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '12px',
                    background: tagColors.pillBg,
                    color: tagColors.textColor,
                    border: `1px solid ${tagColors.borderColor}`,
                  }}
                >
                  {tag}
                </span>
              );
            })}
            {card.tags.length > 5 && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '12px',
                  background: colors.pillBg,
                  color: colors.textColor,
                  border: `1px solid ${colors.borderColor}`,
                }}
              >
                +{card.tags.length - 5}
              </span>
            )}
          </div>
        )}

        {/* 摘要 */}
        {card.excerpt && (
          <p
            style={{
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
            }}
          >
            {card.excerpt}
          </p>
        )}

        {/* 元信息 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '12px',
            borderTop: `1px solid ${colors.borderColor}`,
            fontSize: '12px',
            opacity: 0.6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px' }}>
              {formatRelativeTime(card.updatedAt || card.publishedAt || card.createdAt)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {card.readTime && (
              <span>
                <ClockCircleOutlined /> {card.readTime}min
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

