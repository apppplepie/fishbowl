'use client';

import React from 'react';
import './card-blocks.css';
import { CodeOutlined } from '@ant-design/icons';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import { useCardBackground } from '@/app/components/ui/useCardBackground';
import type { MasonryProps } from '@/app/types/card';
import { Tag, Card } from '@/app/components/ui';
import { BLOCK_SPANS, spanToHeightPx } from '@/lib/lib-card-layout/constants';

export interface CodeCardProps {
  card: {
    id: string;
    title: string;
    excerpt: string;
    author: string;
    updatedAt?: string;
    publishedAt?: string;
    createdAt?: string;
    codePreview?: string;
    codeLanguage?: string;
    codeBlockCount?: number;
    tags?: string[];
    likes?: number;
    comments?: number;
  };
  onClick?: () => void;
  onMouseEnter?: () => void;
  priority?: boolean;
  className?: string;
}

/**
 * 代码主导卡片 - 方案A：代码预览式
 * 适合技术文章、代码示例分享
 */
export default function CodeCard({
  card,
  onClick,
  onMouseEnter,
  priority = false,
  className = '',
  masonry,
  span,
  layout,
}: CodeCardProps & MasonryProps) {
  const colors = useCardBackground(card.id || '');
  const CODE_LINE_COUNT = 4;
  const codeBlockHeightPx = spanToHeightPx(BLOCK_SPANS.CODE_BLOCK);
  const codeWrapPaddingVertical = 32;
  const codeInnerHeightPx = codeBlockHeightPx - codeWrapPaddingVertical;
  const codeLineHeightPx = codeInnerHeightPx / CODE_LINE_COUNT;
  const rawLines = card.codePreview
    ? card.codePreview.split('\n').slice(0, CODE_LINE_COUNT)
    : ['// 代码示例', 'function example() {', '  return "Hello World";'];
  const codeLines = [...rawLines, ...Array(Math.max(0, CODE_LINE_COUNT - rawLines.length)).fill('')];

  return (
    <Card
      hoverable
      id={card.id || ''}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      borderSides="x"
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column' }}
      className={[className, masonry && 'masonry-item'].filter(Boolean).join(' ') || undefined}
      style={span != null ? { gridRow: `span ${span}` } : undefined}
      dataMasonry={masonry || undefined}
      dataMasonrySpan={span != null ? span : undefined}
      dataCardId={card.id || ''}
      dataCardType="CODE_CARD"
    >
      <div className="card-block--pad-top" aria-hidden />
      <div className="card-block-title card-block-title--code card-block--title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <CodeOutlined style={{ fontSize: '20px' }} />
          <h3 className="card-block-title__text" style={{ color: colors.textColor }}>
            {card.title}
          </h3>
        </div>
        {card.tags && card.tags.length > 0 && (
          <div style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {card.tags.slice(0, 5).map((tag: string, index: number) => (
              <Tag key={index} id={tag}>{tag}</Tag>
            ))}
            {card.tags.length > 5 && <Tag id={`more-${card.id}`}>+{card.tags.length - 5}</Tag>}
          </div>
        )}
      </div>
      <div className="card-block--gap" aria-hidden />
      <div
        className="card-block-code-wrap card-block--code"
        style={{ background: '#282c34', borderTop: `2px solid ${colors.borderColor}`, borderBottom: `2px solid ${colors.borderColor}` }}
      >
        {/* 语言标签 */}
        {card.codeLanguage && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            background: 'rgba(24, 144, 255, 0.2)',
            color: '#61dafb',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
          }}>
            {card.codeLanguage}
          </div>
        )}

        {/* 代码内容：高度与 CODE_BLOCK span 对齐，避免卡片撑不开 */}
        <pre style={{
          margin: 0,
          minHeight: codeInnerHeightPx,
          fontSize: '13px',
          lineHeight: `${codeLineHeightPx}px`,
          color: '#abb2bf',
          fontFamily: '"Fira Code", "Courier New", monospace',
          overflow: 'hidden',
        }}>
          <code>
            {codeLines.map((line, index) => (
              <div key={index} style={{ minHeight: codeLineHeightPx }}>
                {line || ' '}
              </div>
            ))}
            {card.codePreview && card.codePreview.split('\n').length > CODE_LINE_COUNT && (
              <div style={{ color: '#61dafb', marginTop: '4px' }}>
                // ...
              </div>
            )}
          </code>
        </pre>
      </div>

      {/* 底部信息栏 */}
      {/* <div style={{
        padding: '12px 20px',
        background: '#fafafa',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
        color: '#666',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>👤 {card.author}</span>
          {card.codeBlockCount && card.codeBlockCount > 1 && (
            <span style={{ 
              background: '#e6f7ff', 
              color: '#1890ff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              {card.codeBlockCount} 个代码块
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#999' }}>
          {(card.likes !== undefined && card.likes !== null) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              ❤️ {card.likes}
            </span>
          )}
          {(card.comments !== undefined && card.comments !== null) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageOutlined /> {card.comments}
            </span>
          )}
          <span style={{ fontSize: '12px' }}>
            📝 {formatRelativeTime(card.updatedAt || card.publishedAt || card.createdAt || new Date().toISOString())}
          </span>
        </div> */}
      {/* </div> */}
    </Card>
  );
}

