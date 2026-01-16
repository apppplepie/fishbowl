import React from 'react';
import Image from 'next/image';
import type { ImageCard as ImageCardType } from '@/app/types/card';
import { PictureOutlined } from '@ant-design/icons';
import { generateVisualsFromId } from '@/app/components/ui/colorUtils';

export interface ImageCardServerProps {
  card: ImageCardType | any;
  priority?: boolean;
}

/**
 * ImageCard Server Component 版本
 * 用于首屏 SSR，无客户端交互，无 hydration
 */
export default function ImageCardServer({ card, priority = false }: ImageCardServerProps) {
  const cardId = card.id?.toString() || card._id?.toString() || '';
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
      <div className="relative z-10" style={{ padding: 0 }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '100%',
            aspectRatio: '3 / 2',
            background: colors.background,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <Image
            src={card.coverImage?.url || card.imageUrl || card.firstImageUrl}
            alt={card.coverImage?.title || card.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1440px) 25vw, 400px"
            style={{
              objectFit: 'cover',
              maxWidth: '100%',
            }}
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI2NyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI2NyIgZmlsbD0iI2YwZjBmMCIvPjwvc3ZnPg=="
          />
        </div>

        {/* 信息区域 */}
        {(card.title || card.description || card.excerpt) && (
          <div style={{ padding: '16px' }}>
            {card.title && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <PictureOutlined style={{ fontSize: '20px' }} />
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
            )}

            {/* 标签 */}
            {card.tags && card.tags.length > 0 && (
              <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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

            {(card.description || card.excerpt) && (
              <p
                style={{
                  margin: 0,
                  color: colors.textColor,
                  opacity: 0.8,
                  fontSize: '14px',
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {card.description || card.excerpt}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

